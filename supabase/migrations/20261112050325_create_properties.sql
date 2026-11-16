
-- propiedades de dci

create table public.properties (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  operation text not null
    check (operation in ('sale', 'rent')),

  type text not null,

  price numeric(14,2) not null
    check (price > 0),

  old_price numeric(14,2)
    check (old_price > 0),

  city text not null,
  zone text not null,

  bedrooms integer
    check (bedrooms >= 0),

  bathrooms numeric(3,1)
    check (bathrooms >= 0),

  parking integer
    check (parking >= 0),

  area_m2 numeric(12,2)
    check (area_m2 > 0),

  status text not null default 'available'
    check (
      status in ('available', 'reserved', 'sold', 'rented')
    ),

  published boolean not null default false,
  featured boolean not null default false,

  agent_id uuid references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);

-- activar seguridad

alter table public.properties enable row level security;

-- quitar permisos automáticos

revoke all on table public.properties
from public, anon, authenticated;

-- permitir únicamente consultas desde la aplicación

grant select on table public.properties
to anon, authenticated;

-- acceso del backend autorizado

grant select, insert, update, delete
on table public.properties to service_role;

-- visitantes: solo propiedades publicadas y vigentes

create policy "public read properties"
on public.properties
for select
to anon, authenticated
using (
  published = true
  and status in ('available', 'reserved')
);

-- asesores: propiedades asignadas

create policy "agent read properties"
on public.properties
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

-- administradores: todas las propiedades

create policy "admin read properties"
on public.properties
for select
to authenticated
using (
  (select private.is_admin())
);

-- índices para consultas frecuentes

create index properties_agent_idx
on public.properties(agent_id);

create index properties_public_idx
on public.properties(published, status);

create index properties_search_idx
on public.properties(operation, price);
