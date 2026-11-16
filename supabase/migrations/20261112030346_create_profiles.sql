
-- tabla de usuarios de dci

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'agent',
  active boolean not null default false,
  created_at timestamptz not null default now(),

  constraint valid_role
    check (role in ('admin', 'agent'))
);

-- activar seguridad de filas

alter table public.profiles enable row level security;

-- quitar permisos generales

revoke all on table public.profiles
from public, anon, authenticated;

-- los usuarios autenticados solo pueden consultar

grant select on table public.profiles
to authenticated;

-- el backend autorizado podra administrar perfiles

grant select, insert, update, delete
on table public.profiles to service_role;

-- cada usuario puede consultar su propio perfil

create policy "read own profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
);


-- funciones internas de seguridad

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- comprobar si el usuario es administrador

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and active = true
  );
$$;

-- limitar quién puede ejecutar la función

revoke all on function private.is_admin()
from public, anon, authenticated;

grant execute on function private.is_admin()
to authenticated;

-- permitir que admin consulte los perfiles

create policy "admin read profiles"
on public.profiles
for select
to authenticated
using (
  (select private.is_admin())
);

