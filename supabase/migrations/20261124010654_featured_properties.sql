
-- DCI: destacar propiedades

create or replace function public.dci_feature_property(
  p_property_id uuid,
  p_featured boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- comprobar que sea un administrador activo
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  ) then
    raise exception 'No tienes permiso para destacar propiedades'
      using errcode = '42501';
  end if;

  -- validar el valor recibido
  if p_featured is null then
    raise exception 'Valor no válido'
      using errcode = '22023';
  end if;

  -- actualizar la propiedad
  update public.properties
  set featured = p_featured
  where id = p_property_id;

  if not found then
    raise exception 'Propiedad no encontrada'
      using errcode = 'P0002';
  end if;

end;
$$;

-- proteger la función
revoke all
on function public.dci_feature_property(uuid, boolean)
from public, anon, authenticated;

grant execute
on function public.dci_feature_property(uuid, boolean)
to authenticated;
