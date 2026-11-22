
-- cambiar el asesor asignado a una propiedad
-- solamente para administradores activos

create or replace function public.dci_assign_property(
  p_property_id uuid,
  p_agent_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- comprobar que es administrador
  if not coalesce(private.is_admin(), false) then
    raise exception 'No autorizado'
      using errcode = '42501';
  end if;

  -- comprobar que el asesor existe y esta activo
  if p_agent_id is not null and not exists (
    select 1
    from public.profiles
    where id = p_agent_id
      and role = 'agent'
      and active = true
  ) then
    raise exception 'Asesor no valido';
  end if;

  -- actualizar la propiedad
  update public.properties
  set agent_id = p_agent_id
  where id = p_property_id;

  -- comprobar que encontramos la propiedad
  if not found then
    raise exception 'Propiedad no encontrada';
  end if;

end;
$$;

-- impedir que usuarios publicos ejecuten la funcion
revoke all
on function public.dci_assign_property(uuid, uuid)
from public, anon;

-- permitir que usuarios autenticados la llamen
-- la funcion comprobara si son administradores
grant execute
on function public.dci_assign_property(uuid, uuid)
to authenticated;
asd