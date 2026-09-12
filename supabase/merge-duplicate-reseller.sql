-- Mescla os dois cadastros da ENERGISE sem perder vinculos.
-- Mantemos o cadastro mais novo porque seu ID ja esta sendo usado pelo portal atual.

begin;

do $merge$
declare
  keep_reseller_id constant text := 'c20f59d1-8f80-4fe7-8976-6ac362d41f54';
  duplicate_reseller_id constant text := '4f052a3d-9424-4d99-9c8c-962ff1f4b6b4';
  keep_count integer;
  duplicate_count integer;
begin
  select count(*) into keep_count
  from public.resellers
  where id = keep_reseller_id;

  select count(*) into duplicate_count
  from public.resellers
  where id = duplicate_reseller_id;

  if keep_count <> 1 or duplicate_count <> 1 then
    raise exception 'Mesclagem cancelada: os dois revendedores esperados nao foram encontrados.';
  end if;

  -- Preenche eventuais campos vazios do cadastro mantido com os dados do antigo.
  update public.resellers as keep
  set
    name = coalesce(nullif(keep.name, ''), duplicate.name),
    cnpj = coalesce(nullif(keep.cnpj, ''), duplicate.cnpj),
    razao_social = coalesce(nullif(keep.razao_social, ''), duplicate.razao_social),
    nome_fantasia = coalesce(nullif(keep.nome_fantasia, ''), duplicate.nome_fantasia),
    ie = coalesce(nullif(keep.ie, ''), duplicate.ie),
    cep = coalesce(nullif(keep.cep, ''), duplicate.cep),
    logradouro = coalesce(nullif(keep.logradouro, ''), duplicate.logradouro),
    numero = coalesce(nullif(keep.numero, ''), duplicate.numero),
    complemento = coalesce(nullif(keep.complemento, ''), duplicate.complemento),
    bairro = coalesce(nullif(keep.bairro, ''), duplicate.bairro),
    cidade = coalesce(nullif(keep.cidade, ''), duplicate.cidade),
    estado = coalesce(nullif(keep.estado, ''), duplicate.estado),
    telefone = coalesce(nullif(keep.telefone, ''), duplicate.telefone),
    email = coalesce(nullif(keep.email, ''), duplicate.email),
    site = coalesce(nullif(keep.site, ''), duplicate.site),
    phone = coalesce(nullif(keep.phone, ''), duplicate.phone),
    observacoes = coalesce(nullif(keep.observacoes, ''), duplicate.observacoes),
    status = coalesce(nullif(keep.status, ''), duplicate.status),
    created_at = least(keep.created_at, duplicate.created_at),
    updated_at = now()
  from public.resellers as duplicate
  where keep.id = keep_reseller_id
    and duplicate.id = duplicate_reseller_id;

  update public.clients
  set reseller_id = keep_reseller_id,
      updated_at = now()
  where reseller_id = duplicate_reseller_id;

  update public.projects
  set reseller_id = keep_reseller_id,
      updated_at = now()
  where reseller_id = duplicate_reseller_id;

  update public.reseller_contacts
  set reseller_id = keep_reseller_id
  where reseller_id = duplicate_reseller_id;

  if exists (
    select 1 from public.clients where reseller_id = duplicate_reseller_id
  ) or exists (
    select 1 from public.projects where reseller_id = duplicate_reseller_id
  ) or exists (
    select 1 from public.reseller_contacts where reseller_id = duplicate_reseller_id
  ) then
    raise exception 'Mesclagem cancelada: ainda existem registros ligados ao cadastro duplicado.';
  end if;

  delete from public.resellers
  where id = duplicate_reseller_id;

  if (select count(*) from public.resellers where id in (keep_reseller_id, duplicate_reseller_id)) <> 1 then
    raise exception 'Mesclagem cancelada: validacao final do revendedor falhou.';
  end if;
end
$merge$;

-- Evita um novo cadastro com o mesmo CNPJ, independentemente da pontuacao usada.
create unique index if not exists resellers_cnpj_digits_unique
on public.resellers ((regexp_replace(cnpj, '[^0-9]', '', 'g')))
where cnpj is not null and regexp_replace(cnpj, '[^0-9]', '', 'g') <> '';

commit;

-- Resultado esperado: 1 revendedor, 11 clientes e 6 projetos.
select
  r.id,
  r.name,
  count(distinct c.id) as clientes,
  count(distinct p.id) as projetos
from public.resellers r
left join public.clients c on c.reseller_id = r.id
left join public.projects p on p.reseller_id = r.id
where r.id = 'c20f59d1-8f80-4fe7-8976-6ac362d41f54'
group by r.id, r.name;
