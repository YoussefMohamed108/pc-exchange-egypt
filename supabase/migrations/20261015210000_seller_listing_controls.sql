-- Seller availability is independent of the admin's hidden flag.
alter table public.marketplace_listings drop constraint marketplace_listings_status_check;
alter table public.marketplace_listings add constraint marketplace_listings_status_check
 check (status in ('draft','listed','paused','sold','archived'));
alter table public.marketplace_listings add column seller_deleted boolean not null default false;
alter table public.marketplace_listings add constraint seller_deleted_has_timestamp
 check (not seller_deleted or deleted_at is not null);

create or replace function pcx_private.guard_product_state() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.reference_number<>old.reference_number then raise exception 'Product reference is permanent'; end if;
 if old.deleted_at is not null and new.deleted_at is not null then raise exception 'Restore the product before editing'; end if;
 if tg_table_name='products' then
  if new.deleted_at is not null then new.status:='archived'; new.admin_paused:=true;
  elsif new.admin_paused then new.status:='draft'; end if;
 else
  if new.deleted_at is not null then
   new.status:='archived';
   if not new.seller_deleted then new.hidden:=true; end if;
  else new.seller_deleted:=false;
  end if;
  if new.revision<>old.revision or new.hidden or new.status<>'listed' then
   update public.inspection_requests set status='cancelled',admin_note='Listing changed or is unavailable. Request a new inspection when ready.',updated_at=clock_timestamp()
    where listing_id=new.id and status in ('requested','scheduled');
  end if;
 end if;
 return new;
end $$;

create function public.seller_listing_action(lid uuid,expected_updated_at timestamptz,operation text,confirmation text default '') returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); l public.marketplace_listings;
begin
 if operation is null or operation not in ('pause','resume','sold','relist','delete','restore') then raise exception 'Invalid seller operation'; end if;
 select * into l from public.marketplace_listings where id=lid for update;
 if not found or l.seller_id<>uid then raise exception 'Listing ownership required' using errcode='42501'; end if;
 if l.updated_at is distinct from expected_updated_at then raise exception 'Listing changed; reload before editing'; end if;
 if l.deleted_at is not null then
  if operation<>'restore' or not l.seller_deleted then raise exception 'Only your own deletion can be restored'; end if;
 elsif operation='restore' then raise exception 'Listing is not deleted';
 end if;
 if operation in ('resume','relist') then
  if l.hidden then raise exception 'An admin has paused this listing'; end if;
  if (operation='resume' and l.status<>'paused') or (operation='relist' and l.status not in ('sold','archived')) then raise exception 'Listing state changed'; end if;
  if not exists(select 1 from public.profile_contacts where user_id=uid) then raise exception 'Complete contact setup first'; end if;
  if cardinality(l.image_paths)=0 or exists(select 1 from unnest(l.image_paths) p where not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p)) then raise exception 'Add valid photos before publishing'; end if;
 elsif operation='pause' and l.status<>'listed' then raise exception 'Only a published listing can be paused';
 elsif operation='sold' and l.status='sold' then raise exception 'Already marked sold';
 elsif operation='delete' and confirmation is distinct from l.reference_code then raise exception 'Confirm the product reference';
 end if;
 update public.marketplace_listings set
  status=case operation when 'pause' then 'paused' when 'resume' then 'listed' when 'relist' then 'listed' when 'sold' then 'sold' when 'restore' then 'draft' else status end,
  deleted_at=case operation when 'delete' then clock_timestamp() when 'restore' then null else deleted_at end,
  seller_deleted=case operation when 'delete' then true when 'restore' then false else seller_deleted end,
  updated_at=clock_timestamp()
 where id=lid;
 insert into public.audit_logs(actor_id,action,entity_id,details)
 values(uid,'seller.'||operation,lid,jsonb_build_object('reference_code',l.reference_code,'previous_status',l.status));
end $$;
revoke execute on function public.seller_listing_action(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.seller_listing_action(uuid,timestamptz,text,text) to authenticated;

-- Reviewing current evidence must not publish a seller-paused listing.
create or replace function pcx_private.review_benchmark(sid uuid,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); b public.benchmark_submissions; l public.marketplace_listings;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision='approved' and coalesce(length(trim(note)),0)=0 then note:='Benchmark evidence approved.'; end if;
 if decision is null or note is null or decision not in ('approved','changes_requested','rejected') or length(trim(note)) not between 5 and 2000 then raise exception 'Decision and reason required'; end if;
 select * into b from public.benchmark_submissions where id=sid;
 if not found then raise exception 'Submission missing'; end if;
 select * into l from public.marketplace_listings where id=b.listing_id for update;
 if not found then raise exception 'Product was deleted; reload the review queue'; end if;
 select * into b from public.benchmark_submissions where id=sid for update;
 if not found then raise exception 'Submission was deleted; reload the review queue'; end if;
 if b.seller_id=uid then raise exception 'Cannot review your own listing'; end if;
 if b.status<>'pending' or l.revision<>b.revision or l.deleted_at is not null or l.status not in ('listed','draft','paused') then raise exception 'Submission is no longer reviewable'; end if;
 if (select id from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1)<>sid then raise exception 'Review the latest submission'; end if;
 update public.benchmark_submissions set status=decision,review_note=trim(note),reviewer_id=uid,reviewed_at=now(),expires_at=case when decision='approved' then now()+interval '90 days' else null end where id=sid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'benchmark.'||decision,sid,jsonb_build_object('listing_id',l.id,'revision',b.revision));
end $$;
notify pgrst,'reload schema';
