
-- permisos para editar propiedades de dci

-- quitar permisos generales de edicion
revoke update on table public.properties
from anon, authenticated;

-- permitir editar solo tres columnas
grant update (title, description, price)
on table public.properties
to authenticated;

-- controlar que propiedades puede editar cada usuario
create policy "dci update properties"
on public.properties
for update
to authenticated

using (
  (select private.is_admin())

  or (
    agent_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'agent'
        and p.active = true
    )
  )
)

with check (
  (select private.is_admin())

  or (
    agent_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'agent'
        and p.active = true
    )
  )
);
