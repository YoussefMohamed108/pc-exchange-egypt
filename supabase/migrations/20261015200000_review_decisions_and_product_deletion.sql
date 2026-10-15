-- Explicit review decisions, resume draft listings, and audited permanent removal.
create or replace function pcx_private.review_benchmark(sid uuid,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); b public.benchmark_submissions; l public.marketplace_listings;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision='approved' and coalesce(length(trim(note)),0)=0 then note:='Benchmark evidence approved.'; end if;
 if decision is null or note is null or decision not in ('approved','changes_requested','rejected') or length(trim(note)) not between 5 and 2000 then raise exception 'Decision and reason required'; end if;
 select * into b from public.benchmark_submissions where id=sid;
 if not found then raise exception 'Submission missing'; end if;
 select * into l from public.marketplace_listings where id=b.listing_id for update;
 select * into b from public.benchmark_submissions where id=sid for update;
 if b.seller_id=uid then raise exception 'Cannot review your own listing'; end if;
 if b.status<>'pending' or l.revision<>b.revision or l.deleted_at is not null or l.status not in ('listed','draft') then raise exception 'Submission is no longer reviewable'; end if;
 if (select id from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1)<>sid then raise exception 'Review the latest submission'; end if;
 update public.benchmark_submissions set status=decision,review_note=trim(note),reviewer_id=uid,reviewed_at=now(),expires_at=case when decision='approved' then now()+interval '90 days' else null end where id=sid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'benchmark.'||decision,sid,jsonb_build_object('listing_id',l.id,'revision',b.revision));
end $$;

create or replace function public.admin_product_action(source text,pid uuid,expected_updated_at timestamptz,operation text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); stamp timestamptz; removed timestamptz; state text;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if source is null or source not in ('seller','company') or operation is null or operation not in ('pause','resume','delete','restore','revoke_benchmark','revoke_inspection') or reason is null or length(trim(reason)) not between 5 and 500 then raise exception 'Valid operation and reason required'; end if;
 if source='seller' then select updated_at,deleted_at,status into stamp,removed,state from public.marketplace_listings where id=pid for update;
 else select updated_at,deleted_at,status into stamp,removed,state from public.products where id=pid for update; end if;
 if not found or stamp is distinct from expected_updated_at then raise exception 'Product changed; reload before managing it'; end if;
 if removed is not null and operation<>'restore' then raise exception 'Restore first'; end if;
 if operation='restore' and removed is null then raise exception 'Product is not deleted'; end if;
 if operation='resume' and source='seller' and state='draft' and not exists(select 1 from public.marketplace_listings l join public.profile_contacts c on c.user_id=l.seller_id where l.id=pid and cardinality(l.image_paths)>0 and not exists(select 1 from unnest(l.image_paths) p where not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p))) then raise exception 'Complete seller contacts and product photos before publishing'; end if;
 if source='seller' then
  if operation='pause' then update public.marketplace_listings set hidden=true,updated_at=clock_timestamp() where id=pid;
  elsif operation='resume' then update public.marketplace_listings set hidden=false,status=case when status='draft' then 'listed' else status end,updated_at=clock_timestamp() where id=pid;
  elsif operation='delete' then update public.marketplace_listings set deleted_at=clock_timestamp(),updated_at=clock_timestamp() where id=pid;
  elsif operation='restore' then update public.marketplace_listings set deleted_at=null,hidden=true,status='draft',updated_at=clock_timestamp() where id=pid;
  else
   if operation='revoke_benchmark' then update public.benchmark_submissions set revoked_at=clock_timestamp(),revoked_reason=trim(reason) where listing_id=pid and status='approved' and revoked_at is null;
   else update public.field_inspections set revoked_at=clock_timestamp(),revoked_reason=trim(reason) where listing_id=pid and revoked_at is null; end if;
   update public.marketplace_listings set updated_at=clock_timestamp() where id=pid;
  end if;
 else
  if operation='pause' then update public.products set admin_paused=true,updated_at=clock_timestamp() where id=pid;
  elsif operation='resume' then update public.products set admin_paused=false,status='listed',updated_at=clock_timestamp() where id=pid;
  elsif operation='delete' then update public.products set deleted_at=clock_timestamp(),updated_at=clock_timestamp() where id=pid;
  elsif operation='restore' then update public.products set deleted_at=null,admin_paused=true,status='draft',updated_at=clock_timestamp() where id=pid;
  elsif operation='revoke_inspection' then
   update public.inspection_reports set revoked_at=clock_timestamp(),revoked_reason=trim(reason) where product_id=pid and revoked_at is null;
   update public.products set updated_at=clock_timestamp() where id=pid;
  else raise exception 'Company stock has no seller benchmark watermark'; end if;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'product.'||operation,pid,jsonb_build_object('source',source,'reason',trim(reason)));
end $$;

-- File tombstones make interrupted storage cleanup retryable and prevent path reuse.
create table pcx_private.deleted_product_files (
 bucket_id text not null check(bucket_id in ('marketplace-images','product-images','benchmark-evidence')),
 object_path text not null, created_at timestamptz not null default now(), cleaned_at timestamptz,
 primary key(bucket_id,object_path)
);
revoke all on pcx_private.deleted_product_files from public,anon,authenticated;

create function pcx_private.guard_deleted_files() returns trigger language plpgsql security definer set search_path='' as $$
declare paths text[]; bucket text;
begin
 if tg_table_name='benchmark_submissions' then paths:=array[new.object_path]; bucket:='benchmark-evidence';
 elsif tg_table_name='field_inspections' then paths:=new.photo_paths; bucket:='marketplace-images';
 else paths:=new.image_paths; bucket:=case when tg_table_name='products' then 'product-images' else 'marketplace-images' end; end if;
 if exists(select 1 from pcx_private.deleted_product_files f where f.bucket_id=bucket and f.object_path=any(paths)) then raise exception 'Upload a new image; this file belongs to a permanently deleted product'; end if;
 return new;
end $$;
create trigger listing_deleted_files before insert or update of image_paths on public.marketplace_listings for each row execute function pcx_private.guard_deleted_files();
create trigger product_deleted_files before insert or update of image_paths on public.products for each row execute function pcx_private.guard_deleted_files();
create trigger inspection_deleted_files before insert or update of photo_paths on public.field_inspections for each row execute function pcx_private.guard_deleted_files();
create trigger benchmark_deleted_files before insert or update of object_path on public.benchmark_submissions for each row execute function pcx_private.guard_deleted_files();
revoke execute on function pcx_private.guard_deleted_files() from public,anon,authenticated;

create function public.admin_delete_product(source text,pid uuid,expected_updated_at timestamptz,confirmation text,reason text) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); ref text; stamp timestamptz; photos text[]; pdfs text[];
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if source is null or source not in ('seller','company') or reason is null or length(trim(reason)) not between 5 and 500 then raise exception 'Valid source and reason required'; end if;
 -- Freeze file associations while checking shared media; normal writes remain transactional.
 lock table public.marketplace_listings,public.products,public.field_inspections,public.benchmark_submissions in share row exclusive mode;
 if source='seller' then select reference_code,updated_at,image_paths into ref,stamp,photos from public.marketplace_listings where id=pid for update;
 else select reference_code,updated_at,image_paths into ref,stamp,photos from public.products where id=pid for update; end if;
 if not found or stamp is distinct from expected_updated_at then raise exception 'Product changed; reload before deleting'; end if;
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
  insert into pcx_private.deleted_product_files(bucket_id,object_path)
   select 'benchmark-evidence',p from unnest(pdfs) p on conflict do nothing;
  insert into pcx_private.deleted_product_files(bucket_id,object_path)
   select distinct 'marketplace-images',p from unnest(photos) p
   where not exists(select 1 from public.marketplace_listings where p=any(image_paths))
    and not exists(select 1 from public.field_inspections where p=any(photo_paths))
    and not exists(select 1 from public.benchmark_submissions where (snapshot->'image_paths') ? p)
   on conflict do nothing;
 else
  delete from public.inspection_private_notes where report_id in(select id from public.inspection_reports where product_id=pid);
  delete from public.inspection_reports where product_id=pid;
  delete from public.inventory_items where product_id=pid;
  delete from public.products where id=pid;
  insert into pcx_private.deleted_product_files(bucket_id,object_path)
   select distinct 'product-images',p from unnest(photos) p where not exists(select 1 from public.products where p=any(image_paths)) on conflict do nothing;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'product.permanently_deleted',pid,jsonb_build_object('source',source,'reference_code',ref,'reason',trim(reason)));
 return ref;
end $$;

create function public.admin_pending_file_cleanup() returns table(bucket_id text,object_path text) language plpgsql stable security definer set search_path='' as $$
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 return query select f.bucket_id,f.object_path from pcx_private.deleted_product_files f where f.cleaned_at is null order by f.created_at,f.bucket_id,f.object_path limit 100;
end $$;
create function public.admin_finish_file_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 update pcx_private.deleted_product_files f set cleaned_at=clock_timestamp() where cleaned_at is null and not exists(select 1 from storage.objects o where o.bucket_id=f.bucket_id and o.name=f.object_path);
end $$;
create function pcx_private.can_cleanup_product_file(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
  and exists(select 1 from pcx_private.deleted_product_files where bucket_id=bucket and object_path=path and cleaned_at is null)
$$;
revoke execute on function pcx_private.can_cleanup_product_file(text,text) from public,anon,authenticated;
grant execute on function pcx_private.can_cleanup_product_file(text,text) to authenticated;
create policy deleted_product_file_read on storage.objects for select to authenticated using(pcx_private.can_cleanup_product_file(bucket_id,name));
create policy deleted_product_file_remove on storage.objects for delete to authenticated using(pcx_private.can_cleanup_product_file(bucket_id,name));
revoke execute on function public.admin_delete_product(text,uuid,timestamptz,text,text),public.admin_pending_file_cleanup(),public.admin_finish_file_cleanup() from public,anon,authenticated;
grant execute on function public.admin_delete_product(text,uuid,timestamptz,text,text),public.admin_pending_file_cleanup(),public.admin_finish_file_cleanup() to authenticated;
notify pgrst,'reload schema';
