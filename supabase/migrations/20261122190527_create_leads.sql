
-- CRM de DCI: registro de clientes interesados

create table public.leads (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  email text,
  phone text,
  message text,

  property_id uuid references public.properties(id)
    on delete set null,

  agent_id uuid references public.profiles(id)
    on delete set null,

  status text not null default 'new'
    check (
      status in (
        'new',
        'contacted',
        'qualified',
        'closed'
      )
    ),

  notes text not null default '',

  created_at timestamptz not null default now(),

  constraint lead_contact_required check (
    nullif(trim(coalesce(email, '')), '') is not null
    or
    nullif(trim(coalesce(phone, '')), '') is not null
  )
);

-- proteger los datos personales
alter table public.leads enable row level security;

-- quitar el acceso general
revoke all on public.leads
from public, anon, authenticated;

-- solamente usuarios autenticados pueden consultar
-- las filas que permitan las politicas RLS
grant select on public.leads to authenticated;

-- el administrador puede ver todos los clientes
create policy "dci admin read leads"
on public.leads
for select
to authenticated
using (
  (select private.is_admin())
);

-- cada asesor puede ver solamente sus clientes
create policy "dci agent read leads"
on public.leads
for select
to authenticated
using (
  agent_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'agent'
      and p.active = true
  )
);
