
-- permitir al administrador crear propiedades

grant insert
on table public.properties
to authenticated;

-- solamente administradores activos pueden crear
create policy "dci admin create properties"
on public.properties
for insert
to authenticated
with check (
  (select private.is_admin())
  and published = false
  and (
    agent_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = agent_id
        and p.role = 'agent'
        and p.active = true
    )
  )
);
