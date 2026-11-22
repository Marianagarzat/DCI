
-- DCI: asignar prospectos a asesores
-- Solo administradores activos

create or replace function public.dci_assign_lead(
  p_lead_id uuid,
  p_agent_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Verificar que el usuario sea administrador activo
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  ) then
    raise exception 'Solo los administradores pueden asignar prospectos'
      using errcode = '42501';
  end if;

  -- Comprobar que el asesor exista y esté activo
  -- NULL significa dejar el prospecto sin asignar
  if p_agent_id is not null and not exists (
    select 1
    from public.profiles
    where id = p_agent_id
      and role = 'agent'
      and active = true
  ) then
    raise exception 'El asesor no existe o está inactivo'
      using errcode = '22023';
  end if;

  -- Guardar la asignación
  update public.leads
  set agent_id = p_agent_id
  where id = p_lead_id;

  if not found then
    raise exception 'Prospecto no encontrado'
      using errcode = 'P0002';
  end if;

end;
$$;

-- Proteger la función
revoke all
on function public.dci_assign_lead(uuid, uuid)
from public, anon, authenticated;

-- Los usuarios autenticados pueden llamar la función,
-- pero solamente administradores activos podrán utilizarla
grant execute
on function public.dci_assign_lead(uuid, uuid)
to authenticated;
