-- Mescla clientes com o mesmo CPF/CNPJ, preservando o ID que possui projetos.

begin;

do $merge$
declare
  pair record;
  keep_document text;
  duplicate_document text;
begin
  for pair in
    select *
    from (values
      ('a7875291-6b24-4fa3-bc08-cd4d1210fff0'::text, '5446df10-6cc8-4ec9-bf69-530aa6b5cb6b'::text),
      ('e7a8074c-2996-4cf8-8d03-a540ec2d561f'::text, '06e90cfd-5293-4143-8769-920d126e76cd'::text),
      ('885e6514-3fcf-4a99-8342-7e366b8c9898'::text, 'b8985570-2d75-4786-9af8-168c251c3136'::text)
    ) as pairs(keep_id, duplicate_id)
  loop
    if not exists (select 1 from public.clients where id = pair.keep_id)
      or not exists (select 1 from public.clients where id = pair.duplicate_id) then
      raise exception 'Mesclagem cancelada: par de clientes nao encontrado (% / %).', pair.keep_id, pair.duplicate_id;
    end if;

    if not exists (select 1 from public.projects where client_id = pair.keep_id) then
      raise exception 'Mesclagem cancelada: o cliente principal % nao possui projeto.', pair.keep_id;
    end if;

    select regexp_replace(coalesce(cpf_cnpj, ''), '[^0-9]', '', 'g')
    into keep_document
    from public.clients
    where id = pair.keep_id;

    select regexp_replace(coalesce(cpf_cnpj, ''), '[^0-9]', '', 'g')
    into duplicate_document
    from public.clients
    where id = pair.duplicate_id;

    if keep_document = '' or keep_document <> duplicate_document then
      raise exception 'Mesclagem cancelada: documentos divergentes no par % / %.', pair.keep_id, pair.duplicate_id;
    end if;

    -- Mantem o ID com projetos e aproveita os dados mais recentes nao vazios.
    update public.clients as keep
    set
      reseller_id = coalesce(nullif(duplicate.reseller_id, ''), keep.reseller_id),
      name = coalesce(nullif(duplicate.name, ''), keep.name),
      razao_social = coalesce(nullif(duplicate.razao_social, ''), keep.razao_social),
      nome_fantasia = coalesce(nullif(duplicate.nome_fantasia, ''), keep.nome_fantasia),
      cpf_cnpj = coalesce(nullif(duplicate.cpf_cnpj, ''), keep.cpf_cnpj),
      email = coalesce(nullif(duplicate.email, ''), keep.email),
      phone = coalesce(nullif(duplicate.phone, ''), keep.phone),
      site = coalesce(nullif(duplicate.site, ''), keep.site),
      cep = coalesce(nullif(duplicate.cep, ''), keep.cep),
      logradouro = coalesce(nullif(duplicate.logradouro, ''), keep.logradouro),
      numero = coalesce(nullif(duplicate.numero, ''), keep.numero),
      complemento = coalesce(nullif(duplicate.complemento, ''), keep.complemento),
      bairro = coalesce(nullif(duplicate.bairro, ''), keep.bairro),
      city = coalesce(nullif(duplicate.city, ''), keep.city),
      state = coalesce(nullif(duplicate.state, ''), keep.state),
      address = coalesce(nullif(duplicate.address, ''), keep.address),
      numero_uc = coalesce(nullif(duplicate.numero_uc, ''), keep.numero_uc),
      latitude = coalesce(nullif(duplicate.latitude, ''), keep.latitude),
      longitude = coalesce(nullif(duplicate.longitude, ''), keep.longitude),
      observacoes = coalesce(nullif(duplicate.observacoes, ''), keep.observacoes),
      created_at = least(keep.created_at, duplicate.created_at),
      updated_at = now()
    from public.clients as duplicate
    where keep.id = pair.keep_id
      and duplicate.id = pair.duplicate_id;

    -- Remove responsaveis repetidos e transfere qualquer contato exclusivo.
    delete from public.client_responsibles as duplicate_responsible
    where duplicate_responsible.client_id = pair.duplicate_id
      and exists (
        select 1
        from public.client_responsibles as keep_responsible
        where keep_responsible.client_id = pair.keep_id
          and (
            (
              regexp_replace(coalesce(keep_responsible.cpf, ''), '[^0-9]', '', 'g') <> ''
              and regexp_replace(coalesce(keep_responsible.cpf, ''), '[^0-9]', '', 'g') =
                  regexp_replace(coalesce(duplicate_responsible.cpf, ''), '[^0-9]', '', 'g')
            )
            or (
              nullif(lower(trim(keep_responsible.email)), '') is not null
              and lower(trim(keep_responsible.email)) = lower(trim(duplicate_responsible.email))
            )
            or (
              lower(trim(keep_responsible.name)) = lower(trim(duplicate_responsible.name))
              and lower(trim(coalesce(keep_responsible.role, ''))) = lower(trim(coalesce(duplicate_responsible.role, '')))
            )
          )
      );

    update public.client_responsibles
    set client_id = pair.keep_id
    where client_id = pair.duplicate_id;

    update public.projects
    set client_id = pair.keep_id,
        updated_at = now()
    where client_id = pair.duplicate_id;

    delete from public.clients
    where id = pair.duplicate_id;

    if exists (select 1 from public.clients where id = pair.duplicate_id)
      or exists (select 1 from public.projects where client_id = pair.duplicate_id)
      or exists (select 1 from public.client_responsibles where client_id = pair.duplicate_id) then
      raise exception 'Mesclagem cancelada: ainda existem vinculos com o cliente %.', pair.duplicate_id;
    end if;
  end loop;
end
$merge$;

-- Impede novo cliente com o mesmo CPF/CNPJ, mesmo que a pontuacao seja diferente.
create unique index if not exists clients_cpf_cnpj_digits_unique
on public.clients ((regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')))
where cpf_cnpj is not null and regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') <> '';

commit;

-- Nao deve retornar nenhuma linha.
select
  regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') as documento,
  count(*) as quantidade
from public.clients
where cpf_cnpj is not null and regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') <> ''
group by regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')
having count(*) > 1;
