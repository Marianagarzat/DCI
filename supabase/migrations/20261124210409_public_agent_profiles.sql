
-- DCI: informacion profesional de los asesores

create table private.dci_agent_public_profiles (
  agent_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  display_name text not null
    check (length(trim(display_name)) between 2 and 100),

  bio text not null default ''
    check (length(bio) <= 1000),

  whatsapp text
    check (whatsapp ~ '^[1-9][0-9]{7,14}$'),

  published boolean not null default false
);

-- proteger la informacion

alter table private.dci_agent_public_profiles
enable row level security;

revoke all on private.dci_agent_public_profiles
from public, anon, authenticated;

-- obtener el asesor de una propiedad publica

create or replace function public.dci_get_public_agent(
  p_property_id uuid
)
returns table (
  display_name text,
  bio text,
  whatsapp text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.display_name,
    a.bio,
    a.whatsapp
  from public.properties as p
  join public.profiles as u
    on u.id = p.agent_id
  join private.dci_agent_public_profiles as a
    on a.agent_id = u.id
  where p.id = p_property_id
    and p.published = true
    and p.status in ('available', 'reserved')
    and u.role = 'agent'
    and u.active = true
    and a.published = true;
$$;

-- permitir consultar solamente los datos publicos

revoke all
on function public.dci_get_public_agent(uuid)
from public, anon, authenticated;

grant execute
on function public.dci_get_public_agent(uuid)
to anon, authenticated;
