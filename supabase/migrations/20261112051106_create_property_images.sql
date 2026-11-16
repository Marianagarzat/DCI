
-- fotografias de las propiedades

create table public.property_images (
  id uuid primary key default gen_random_uuid(),

  property_id uuid not null
    references public.properties(id)
    on delete cascade,

  path text not null,

  position integer not null default 0
    check (position >= 0),

  alt_text text,

  created_at timestamptz not null default now(),

  unique (property_id, path)
);

-- seguridad

alter table public.property_images
enable row level security;

revoke all on public.property_images
from public, anon, authenticated;

grant select on public.property_images
to anon, authenticated;

grant select, insert, update, delete
on public.property_images
to service_role;

-- solo ver fotografias de propiedades autorizadas

create policy "read visible property images"
on public.property_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_id
  )
);

-- mejorar la consulta de galerias

create index property_images_order_idx
on public.property_images(property_id, position);
