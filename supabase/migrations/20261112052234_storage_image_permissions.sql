
-- permisos de lectura para fotografias de dci

create policy "dci read property images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'property-images'

  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[1]
  )
);
