
-- DCI: cambiar el estado de un prospecto
-- Solo administradores activos o asesores asignados

create or replace function public.dci_change_lead_status(
  p_lead_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Debe existir una sesión
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión'
      using errcode = '42501';
  end if;

  -- Validar el estado solicitado
  if p_status is null
    or p_status not in (
      'new',
      'contacted',
      'qualified',
      'closed'
    )
  then
    raise exception 'Estado no válido'
      using errcode = '22023';
  end if;

  -- Actualizar solamente cuando el usuario tiene permiso
  update public.leads as l
  set status = p_status
  where l.id = p_lead_id
    and exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.active = true
        and (
          p.role = 'admin'
          or (
            p.role = 'agent'
            and l.agent_id = p.id
          )
        )
    );

  if not found then
    raise exception 'Prospecto no encontrado o sin permiso'
      using errcode = '42501';
  end if;

end;
$$;

-- Impedir que visitantes anónimos la ejecuten
revoke all
on function public.dci_change_lead_status(uuid, text)
from public, anon, authenticated;

-- Permitir llamadas de usuarios con sesión;
-- la función verifica sus permisos internamente
grant execute
on function public.dci_change_lead_status(uuid, text)
to authenticated;
