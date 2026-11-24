
-- DCI: consultar perfiles profesionales

create or replace function public.dci_list_agent_profiles()
returns table (
  agent_id uuid,
  account_name text,
  display_name text,
  bio text,
  whatsapp text,
  published boolean
)
language plpgsql
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

  return query
  select
    p.id,
    p.name,
    coalesce(a.display_name, p.name),
    coalesce(a.bio, ''),
    a.whatsapp,
    coalesce(a.published, false)
  from public.profiles as p
  left join private.dci_agent_public_profiles as a
    on a.agent_id = p.id
  where p.role = 'agent'
    and p.active = true
  order by p.name;

end;
$$;


-- DCI: guardar perfil profesional

create or replace function public.dci_save_agent_profile(
  p_agent_id uuid,
  p_display_name text,
  p_bio text,
  p_whatsapp text,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_whatsapp text;
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

  -- validar nombre profesional
  if p_display_name is null
    or length(trim(p_display_name)) not between 2 and 100
  then
    raise exception 'Nombre profesional no valido'
      using errcode = '22023';
  end if;

  -- validar descripcion
  if length(coalesce(p_bio, '')) > 1000 then
    raise exception 'Descripcion demasiado larga'
      using errcode = '22023';
  end if;

  -- limpiar el numero de WhatsApp
  v_whatsapp := nullif(
    regexp_replace(
      coalesce(p_whatsapp, ''),
      '[+ ()-]',
      '',
      'g'
    ),
    ''
  );

  if v_whatsapp is not null
    and v_whatsapp !~ '^[1-9][0-9]{7,14}$'
  then
    raise exception 'Numero de WhatsApp no valido'
      using errcode = '22023';
  end if;

  -- crear o actualizar el perfil
  insert into private.dci_agent_public_profiles (
    agent_id,
    display_name,
    bio,
    whatsapp,
    published
  )
  values (
    p_agent_id,
    trim(p_display_name),
    trim(coalesce(p_bio, '')),
    v_whatsapp,
    coalesce(p_published, false)
  )
  on conflict (agent_id)
  do update set
    display_name = excluded.display_name,
    bio = excluded.bio,
    whatsapp = excluded.whatsapp,
    published = excluded.published;

end;
$$;


-- proteger las funciones

revoke all
on function public.dci_list_agent_profiles()
from public, anon, authenticated;

revoke all
on function public.dci_save_agent_profile(
  uuid, text, text, text, boolean
)
from public, anon, authenticated;

grant execute
on function public.dci_list_agent_profiles()
to authenticated;

grant execute
on function public.dci_save_agent_profile(
  uuid, text, text, text, boolean
)
to authenticated;
