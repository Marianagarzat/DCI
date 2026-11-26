
-- DCI: vincular fotografias con perfiles profesionales

create or replace function public.dci_set_agent_photo(
  p_agent_id uuid,
  p_photo_path text
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

  -- comprobar que el asesor este activo
  if not exists (
    select 1
    from public.profiles
    where id = p_agent_id
      and role = 'agent'
      and active = true
  ) then
    raise exception 'Asesor no disponible'
      using errcode = '22023';
  end if;

  -- comprobar que la fotografia sea valida
  if p_photo_path is not null then

    -- cada asesor tiene su propia carpeta
    if p_photo_path !~ (
      '^' || p_agent_id::text ||
      '/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'
    ) then
      raise exception 'Ruta de fotografia no valida'
        using errcode = '22023';
    end if;

    -- comprobar que el archivo exista
    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'agent-photos'
        and name = p_photo_path
    ) then
      raise exception 'Fotografia no encontrada'
        using errcode = '22023';
    end if;

  end if;

  -- vincular la fotografia con el perfil
  update private.dci_agent_public_profiles
  set photo_path = p_photo_path
  where agent_id = p_agent_id;

  if not found then
    raise exception 'Primero debes guardar el perfil'
      using errcode = 'P0002';
  end if;

end;
$$;

-- consultar la fotografia desde el panel administrativo

create or replace function public.dci_get_admin_agent_photo(
  p_agent_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

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

  return (
    select a.photo_path
    from private.dci_agent_public_profiles as a
    where a.agent_id = p_agent_id
  );

end;
$$;

-- consultar la fotografia desde el catalogo publico

create or replace function public.dci_get_public_agent_photo(
  p_property_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.photo_path
  from public.properties as p
  join public.profiles as u
    on u.id = p.agent_id
  join private.dci_agent_public_profiles as a
    on a.agent_id = u.id
  where p.id = p_property_id
    and p.published = true
    and p.status in ('available', 'reserved')
    and u.role = 'agent'
    and u.active = true
    and a.published = true;
$$;

-- configurar permisos

revoke all
on function public.dci_set_agent_photo(uuid, text)
from public, anon, authenticated;

revoke all
on function public.dci_get_admin_agent_photo(uuid)
from public, anon, authenticated;

revoke all
on function public.dci_get_public_agent_photo(uuid)
from public, anon, authenticated;

grant execute
on function public.dci_set_agent_photo(uuid, text)
to authenticated;

grant execute
on function public.dci_get_admin_agent_photo(uuid)
to authenticated;

grant execute
on function public.dci_get_public_agent_photo(uuid)
to anon, authenticated;
