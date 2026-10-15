-- Storage objects are not needed by the isolated SQL policy test runtime.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy product_image_read on storage.objects for select to anon,authenticated using(bucket_id='product-images');
create policy product_image_admin_insert on storage.objects for insert to authenticated
with check(bucket_id='product-images' and public.is_admin() and name ~* '^products/[a-f0-9-]+/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$');
create policy product_image_admin_update on storage.objects for update to authenticated
using(bucket_id='product-images' and public.is_admin())
with check(bucket_id='product-images' and public.is_admin() and name ~* '^products/[a-f0-9-]+/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$');
create policy product_image_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin());
