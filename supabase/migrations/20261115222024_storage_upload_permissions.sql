
-- permitir subir fotografias autorizadas

create policy "dci upload property images"
on storage.objects
for insert
to authenticated
with check (

  -- solo en el bucket de dci
  bucket_id = 'property-images'

  -- una carpeta por propiedad
  and array_length(storage.foldername(name), 1) = 1

  -- formatos permitidos
  and lower(storage.extension(name))
    in ('jpg', 'jpeg', 'png', 'webp')

  -- verificar la propiedad y el usuario
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[1]
      and (
        -- administrador activo
        (select private.is_admin())

        or

        -- asesor activo con propiedad asignada
        (
          p.agent_id = (select auth.uid())
          and exists (
            select 1
            from public.profiles u
            where u.id = (select auth.uid())
              and u.role = 'agent'
              and u.active = true
          )
        )
      )
  )
);
