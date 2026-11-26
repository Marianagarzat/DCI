
-- DCI: fotografias profesionales de asesores

alter table private.dci_agent_public_profiles
add column if not exists photo_path text;

-- comprobar si una fotografia puede mostrarse

create or replace function private.dci_can_read_agent_photo(
  p_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.dci_agent_public_profiles as a
    join public.profiles as u
      on u.id = a.agent_id
    join public.properties as p
      on p.agent_id = a.agent_id
    where a.photo_path = p_path
      and a.published = true
      and u.active = true
      and u.role = 'agent'
      and p.published = true
      and p.status in ('available', 'reserved')
  );
$$;

revoke all
on function private.dci_can_read_agent_photo(text)
from public, anon, authenticated;

grant execute
on function private.dci_can_read_agent_photo(text)
to anon, authenticated;

-- permitir consultar fotografias autorizadas

create policy "DCI read published agent photos"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'agent-photos'
  and private.dci_can_read_agent_photo(name)
);

-- permitir al administrador consultar fotografias

create policy "DCI admin read agent photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agent-photos'
  and private.is_admin()
);

-- permitir al administrador subir fotografias

create policy "DCI admin upload agent photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agent-photos'
  and private.is_admin()
);

-- permitir al administrador eliminar fotografias

create policy "DCI admin delete agent photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'agent-photos'
  and private.is_admin()
);
