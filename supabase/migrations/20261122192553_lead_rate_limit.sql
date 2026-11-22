
-- DCI: limitar solicitudes al formulario de contacto

-- guardar contadores en un esquema privado
create schema if not exists private;

create table private.dci_lead_limits (
  scope text not null,
  identifier text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  primary key (scope, identifier)
);

-- proteger los contadores
alter table private.dci_lead_limits enable row level security;

revoke all on private.dci_lead_limits
from public, anon, authenticated;

-- funcion para comprobar los limites
create or replace function public.dci_check_lead_limit(
  p_contact_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin

  -- aceptar solamente identificadores anonimizados
  if p_contact_hash is null
    or p_contact_hash !~ '^[a-f0-9]{64}$'
  then
    return false;
  end if;

  -- limite global: 60 solicitudes cada 10 minutos
  insert into private.dci_lead_limits as l (
    scope,
    identifier,
    window_started_at,
    attempts
  )
  values ('global', 'all', now(), 1)

  on conflict (scope, identifier)
  do update set
    attempts = case
      when l.window_started_at <= now() - interval '10 minutes'
      then 1
      else l.attempts + 1
    end,
    window_started_at = case
      when l.window_started_at <= now() - interval '10 minutes'
      then now()
      else l.window_started_at
    end
  where
    l.window_started_at <= now() - interval '10 minutes'
    or l.attempts < 60

  returning attempts into v_attempts;

  if v_attempts is null then
    return false;
  end if;

  -- limite por contacto: 3 solicitudes por hora
  v_attempts := null;

  insert into private.dci_lead_limits as l (
    scope,
    identifier,
    window_started_at,
    attempts
  )
  values ('contact', p_contact_hash, now(), 1)

  on conflict (scope, identifier)
  do update set
    attempts = case
      when l.window_started_at <= now() - interval '1 hour'
      then 1
      else l.attempts + 1
    end,
    window_started_at = case
      when l.window_started_at <= now() - interval '1 hour'
      then now()
      else l.window_started_at
    end
  where
    l.window_started_at <= now() - interval '1 hour'
    or l.attempts < 3

  returning attempts into v_attempts;

  return v_attempts is not null;

end;
$$;

-- solamente el servidor puede ejecutar la funcion
revoke all
on function public.dci_check_lead_limit(text)
from public, anon, authenticated;

grant execute
on function public.dci_check_lead_limit(text)
to service_role;
