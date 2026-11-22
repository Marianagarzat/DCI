
-- permitir publicar y despublicar propiedades
-- solamente a administradores activos

create or replace function public.dci_publish_property(
  p_property_id uuid,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- comprobar que el usuario es administrador
  if not coalesce(private.is_admin(), false) then
    raise exception 'No autorizado'
      using errcode = '42501';
  end if;

  -- evitar publicar propiedades no disponibles
  if p_published and not exists (
    select 1
    from public.properties
    where id = p_property_id
      and status in ('available', 'reserved')
      and price > 0
      and nullif(trim(title), '') is not null
      and nullif(trim(city), '') is not null
  ) then
    raise exception 'La propiedad no esta lista para publicarse';
  end if;

  -- cambiar el estado de publicacion
  update public.properties
  set published = p_published
  where id = p_property_id;

  if not found then
    raise exception 'Propiedad no encontrada';
  end if;

end;
$$;

-- restringir quien puede ejecutar la funcion
revoke all
on function public.dci_publish_property(uuid, boolean)
from public, anon;

grant execute
on function public.dci_publish_property(uuid, boolean)
to authenticated;
