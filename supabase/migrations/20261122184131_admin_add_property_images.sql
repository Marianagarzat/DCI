
-- permitir registrar fotografias de propiedades

grant insert (
  property_id,
  path,
  position,
  alt_text
)
on public.property_images
to authenticated;

-- solo administradores activos pueden registrar fotos
create policy "dci admin add property images"
on public.property_images
for insert
to authenticated
with check (
  (select private.is_admin())

  -- comprobar que la propiedad existe
  and exists (
    select 1
    from public.properties p
    where p.id = property_id
  )

  -- la foto debe estar en la carpeta de esa propiedad
  and path like (property_id::text || '/%')
);
