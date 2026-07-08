-- Bucket público para imágenes de recetas importadas por administración
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recetas-imagenes',
  'recetas-imagenes',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recipe images are publicly accessible" on storage.objects;
create policy "recipe images are publicly accessible"
on storage.objects
for select
using (bucket_id = 'recetas-imagenes');

drop policy if exists "sandra admin can upload recipe images" on storage.objects;
create policy "sandra admin can upload recipe images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recetas-imagenes'
  and (auth.jwt() ->> 'email') = 'sandralu317@hotmail.com'
);

drop policy if exists "sandra admin can update recipe images" on storage.objects;
create policy "sandra admin can update recipe images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recetas-imagenes'
  and (auth.jwt() ->> 'email') = 'sandralu317@hotmail.com'
);

drop policy if exists "sandra admin can delete recipe images" on storage.objects;
create policy "sandra admin can delete recipe images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recetas-imagenes'
  and (auth.jwt() ->> 'email') = 'sandralu317@hotmail.com'
);
