
-- DCI: ubicaciones publicas de propiedades

alter table public.properties
add column map_lat numeric(9,6),
add column map_lng numeric(9,6);

-- validar las coordenadas

alter table public.properties
add constraint dci_valid_map_coordinates
check (
  (map_lat is null and map_lng is null)
  or (
    map_lat is not null
    and map_lng is not null
    and map_lat between -90 and 90
    and map_lng between -180 and 180
  )
);

-- funcion para guardar la ubicacion

create or replace function public.dci_set_property_location(
  p_property_id uuid,
  p_lat numeric,
  p_lng numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- verificar permisos del administrador
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  ) then
    raise exception 'No tienes permiso'
      using errcode = '42501';
  end if;

  -- guardar las coordenadas
  update public.properties
  set
    map_lat = p_lat,
    map_lng = p_lng
  where id = p_property_id;

  if not found then
    raise exception 'Propiedad no encontrada'
      using errcode = 'P0002';
  end if;

end;
$$;

-- proteger la funcion

revoke all
on function public.dci_set_property_location(uuid,numeric,numeric)
from public, anon, authenticated;

grant execute
on function public.dci_set_property_location(uuid,numeric,numeric)
to authenticated;

-- permitir consultar las coordenadas segun RLS

grant select (map_lat, map_lng)
on public.properties
to anon, authenticated;
