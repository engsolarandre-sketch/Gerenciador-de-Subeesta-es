-- Usuarios internos e auditoria de notificacoes por e-mail.

begin;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  notify_stage_changes boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where id = (select auth.uid())
      and role = 'admin'
      and active = true
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'member'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.app_users.name, ''), excluded.name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.app_users (id, name, email, role)
select
  id,
  coalesce(nullif(raw_user_meta_data->>'name', ''), split_part(email, '@', 1)),
  email,
  'admin'
from auth.users
where email is not null
on conflict (id) do update
set email = excluded.email,
    role = case when public.app_users.role = 'admin' then 'admin' else excluded.role end,
    updated_at = now();

alter table public.app_users enable row level security;

drop policy if exists "Authenticated users can read app users" on public.app_users;
create policy "Authenticated users can read app users"
on public.app_users for select
to authenticated
using (true);

drop policy if exists "Admins can update app users" on public.app_users;
create policy "Admins can update app users"
on public.app_users for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create table if not exists public.stage_email_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete set null,
  stage_id text references public.stages(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  recipients jsonb not null default '[]'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  status text not null check (status in ('sent', 'partial', 'failed', 'skipped')),
  provider_message_ids jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists stage_email_notifications_project_created_idx
on public.stage_email_notifications (project_id, created_at desc);

alter table public.stage_email_notifications enable row level security;

drop policy if exists "Admins can read stage email notifications" on public.stage_email_notifications;
create policy "Admins can read stage email notifications"
on public.stage_email_notifications for select
to authenticated
using (public.is_app_admin());

commit;
