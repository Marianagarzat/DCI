
-- DCI: guardar notas de seguimiento de prospectos

create or replace function public.dci_update_lead_notes(
  p_lead_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Comprobar que el usuario inició sesión
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión'
      using errcode = '42501';
  end if;

  -- Limitar la longitud de las notas
  if p_notes is null or length(p_notes) > 2000 then
    raise exception 'Las notas deben tener máximo 2000 caracteres'
      using errcode = '22023';
  end if;

  -- Actualizar solo si es administrador
  -- o asesor asignado al prospecto
  update public.leads as l
  set notes = trim(p_notes)
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

-- Proteger la función
revoke all
on function public.dci_update_lead_notes(uuid, text)
from public, anon, authenticated;

-- Solo usuarios con sesión pueden llamarla
grant execute
on function public.dci_update_lead_notes(uuid, text)
to authenticated;
