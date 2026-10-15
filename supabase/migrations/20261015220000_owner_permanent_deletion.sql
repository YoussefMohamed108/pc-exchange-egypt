-- One deletion implementation, with explicit owner/admin entry points and scoped file cleanup.
alter table pcx_private.deleted_product_files add column requested_by uuid references auth.users(id) on delete set null;
create index deleted_product_files_pending_owner on pcx_private.deleted_product_files(requested_by,created_at) where cleaned_at is null;

create function pcx_private.delete_product(source text,pid uuid,expected_updated_at timestamptz,confirmation text,reason text,owner_only boolean) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); ref text; stamp timestamptz; photos text[]; pdfs text[]; seller uuid;
begin
 if owner_only then
  if source is distinct from 'seller' or not exists(select 1 from public.marketplace_listings where id=pid and seller_id=uid) then raise exception 'Listing ownership required' using errcode='42501'; end if;
 elsif not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if source is null or source not in ('seller','company') or reason is null or length(trim(reason)) not between 5 and 500 then raise exception 'Valid source and reason required'; end if;
 -- Freeze file associations while checking shared media; normal writes remain transactional.
 lock table public.marketplace_listings,public.products,public.field_inspections,public.benchmark_submissions in share row exclusive mode;
 if source='seller' then select reference_code,updated_at,image_paths,seller_id into ref,stamp,photos,seller from public.marketplace_listings where id=pid for update;
 else select reference_code,updated_at,image_paths into ref,stamp,photos from public.products where id=pid for update; end if;
 if not found or stamp is distinct from expected_updated_at then raise exception 'Product changed; reload before deleting'; end if;
 if owner_only and seller is distinct from uid then raise exception 'Listing ownership required' using errcode='42501'; end if;
 if trim(confirmation) is distinct from ref then raise exception 'Type the exact product reference to confirm permanent deletion'; end if;
 if source='company' and exists(select 1 from public.order_items where product_id=pid) then raise exception 'Product has order history; use recoverable deletion instead'; end if;
 if source='seller' then
  select photos || coalesce(array_agg(p),'{}') into photos from (
   select unnest(photo_paths) p from public.field_inspections where listing_id=pid
   union select jsonb_array_elements_text(snapshot->'image_paths') from public.benchmark_submissions where listing_id=pid
  ) collected;
  select coalesce(array_agg(object_path),'{}') into pdfs from public.benchmark_submissions where listing_id=pid;
  delete from pcx_private.contact_access where listing_id=pid;
  delete from public.benchmark_submissions where listing_id=pid;
  delete from public.marketplace_listings where id=pid;
  insert into pcx_private.deleted_product_files(bucket_id,object_path,requested_by)
   select 'benchmark-evidence',p,uid from unnest(pdfs) p on conflict do nothing;
  insert into pcx_private.deleted_product_files(bucket_id,object_path,requested_by)
   select distinct 'marketplace-images',p,uid from unnest(photos) p
   where not exists(select 1 from public.marketplace_listings where p=any(image_paths))
    and not exists(select 1 from public.field_inspections where p=any(photo_paths))
    and not exists(select 1 from public.benchmark_submissions where (snapshot->'image_paths') ? p)
   on conflict do nothing;
 else
  delete from public.inspection_private_notes where report_id in(select id from public.inspection_reports where product_id=pid);
  delete from public.inspection_reports where product_id=pid;
  delete from public.inventory_items where product_id=pid;
  delete from public.products where id=pid;
  insert into pcx_private.deleted_product_files(bucket_id,object_path,requested_by)
   select distinct 'product-images',p,uid from unnest(photos) p where not exists(select 1 from public.products where p=any(image_paths)) on conflict do nothing;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'product.permanently_deleted',pid,jsonb_build_object('source',source,'reference_code',ref,'reason',trim(reason),'actor_scope',case when owner_only then 'owner' else 'admin' end));
 return ref;
end $$;


revoke execute on function pcx_private.delete_product(text,uuid,timestamptz,text,text,boolean) from public,anon,authenticated;

create or replace function public.admin_delete_product(source text,pid uuid,expected_updated_at timestamptz,confirmation text,reason text) returns text language sql security definer set search_path='' as $$
 select pcx_private.delete_product(source,pid,expected_updated_at,confirmation,reason,false)
$$;
create function public.seller_delete_listing(lid uuid,expected_updated_at timestamptz,confirmation text) returns text language sql security definer set search_path='' as $$
 select pcx_private.delete_product('seller',lid,expected_updated_at,confirmation,'Permanently deleted by the listing owner',true)
$$;

create function public.seller_pending_file_cleanup() returns table(bucket_id text,object_path text) language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user();
begin
 return query select f.bucket_id,f.object_path from pcx_private.deleted_product_files f where f.requested_by=uid and f.cleaned_at is null order by f.created_at,f.bucket_id,f.object_path limit 100;
end $$;
create function public.seller_finish_file_cleanup() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user();
begin
 update pcx_private.deleted_product_files f set cleaned_at=clock_timestamp() where f.requested_by=uid and f.cleaned_at is null and not exists(select 1 from storage.objects o where o.bucket_id=f.bucket_id and o.name=f.object_path);
end $$;
create or replace function pcx_private.can_cleanup_product_file(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
  and exists(select 1 from pcx_private.deleted_product_files f where f.bucket_id=bucket and f.object_path=path and f.cleaned_at is null and (public.is_admin() or f.requested_by=auth.uid()))
$$;
revoke execute on function public.seller_delete_listing(uuid,timestamptz,text),public.seller_pending_file_cleanup(),public.seller_finish_file_cleanup() from public,anon,authenticated;
grant execute on function public.seller_delete_listing(uuid,timestamptz,text),public.seller_pending_file_cleanup(),public.seller_finish_file_cleanup() to authenticated;
notify pgrst,'reload schema';
