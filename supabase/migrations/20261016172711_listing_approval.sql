-- Publication approval is independent of availability and hardware evidence.
alter table public.marketplace_listings drop constraint marketplace_listings_status_check;
alter table public.marketplace_listings add constraint marketplace_listings_status_check check(status in ('draft','pending_review','listed','paused','sold','archived'));
alter table public.marketplace_listings
 add column review_status text not null default 'draft' check(review_status in ('draft','pending','approved','changes_requested','rejected')),
 add column review_note text not null default '' check(length(review_note)<=2000),
 add column reviewed_revision integer,
 add column reviewer_id uuid references public.profiles(id),
 add column reviewed_at timestamptz,
 add column review_submitted_at timestamptz;
-- No historical seller publication is treated as an approval.
update public.marketplace_listings set status=case when status='listed' then 'pending_review' else status end,review_status='pending',review_submitted_at=clock_timestamp(),updated_at=clock_timestamp() where status in ('listed','paused','draft') and deleted_at is null;
alter table public.marketplace_listings add constraint listing_publication_approval check(status<>'listed' or (review_status='approved' and reviewed_revision is not null and reviewed_revision=revision and reviewer_id is not null and reviewed_at is not null));
alter table public.marketplace_listings add constraint listing_review_metadata check(review_status not in ('approved','changes_requested','rejected') or (reviewer_id is not null and reviewed_revision is not null and reviewed_at is not null and (review_status='approved' or length(trim(review_note))>=5)));
create table public.listing_review_history (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
 revision integer not null check(revision>0),
 decision text not null check(decision in ('approved','changes_requested','rejected')),
 note text not null check(length(note)<=2000 and (decision='approved' or length(trim(note))>=5)),
 reviewer_id uuid not null references public.profiles(id), reviewed_at timestamptz not null default clock_timestamp()
);
create index listing_review_history_listing on public.listing_review_history(listing_id,reviewed_at desc);
alter table public.listing_review_history enable row level security;
create policy listing_history_read on public.listing_review_history for select to authenticated using(public.is_admin() or exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.seller_id=(select auth.uid())));
revoke all on public.listing_review_history from public,anon,authenticated;
grant select on public.listing_review_history to authenticated;
create function pcx_private.guard_listing_approval() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  -- Derive content revision even for future mutation paths, not merely the save RPC.
  if (new.title,new.category_slug,new.brand,new.model,new.description,new.known_defects,new.condition,new.specifications,new.image_paths) is distinct from
     (old.title,old.category_slug,old.brand,old.model,old.description,old.known_defects,old.condition,old.specifications,old.image_paths) then
   new.revision:=old.revision+1;
  end if;
  if new.revision<>old.revision then
   new.review_status:='draft'; new.review_note:=''; new.reviewed_revision:=null; new.reviewer_id:=null; new.reviewed_at:=null;
   if new.status='pending_review' then new.review_status:='pending'; new.review_submitted_at:=clock_timestamp(); end if;
  end if;
 end if;
 if new.status='listed' and (new.review_status<>'approved' or new.reviewed_revision is distinct from new.revision) then
  new.status:='pending_review'; new.review_status:='pending'; new.review_submitted_at:=clock_timestamp();
 end if;
 return new;
end $$;
-- Alphabetic trigger order: approval gate must run before inspection cancellation.
create trigger listing_approval_guard before insert or update on public.marketplace_listings for each row execute function pcx_private.guard_listing_approval();
create function pcx_private.review_listing(lid uuid,expected_updated_at timestamptz,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); l public.marketplace_listings;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision is null or decision not in ('approved','changes_requested','rejected') or note is null or length(trim(note))>2000 or (decision<>'approved' and length(trim(note))<5) then raise exception 'Valid decision and refusal reason required'; end if;
 select * into l from public.marketplace_listings where id=lid for update;
 if not found or l.updated_at is distinct from expected_updated_at then raise exception 'Listing changed; reload before reviewing'; end if;
 if l.deleted_at is not null or l.status in ('sold','archived') then raise exception 'Listing is unavailable for review'; end if;
 if decision='approved' and (cardinality(l.image_paths)=0 or not exists(select 1 from public.profile_contacts where user_id=l.seller_id) or exists(select 1 from unnest(l.image_paths) p where not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p))) then raise exception 'Complete contacts and photos before approval'; end if;
 update public.marketplace_listings set review_status=decision,review_note=trim(note),reviewed_revision=revision,reviewer_id=uid,reviewed_at=clock_timestamp(),
 status=case when decision='approved' and status='pending_review' then 'listed' when decision<>'approved' and status='listed' then 'pending_review' else status end,updated_at=clock_timestamp() where id=lid;
 insert into public.listing_review_history(listing_id,revision,decision,note,reviewer_id) values(lid,l.revision,decision,trim(note),uid);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'listing.'||decision,lid,jsonb_build_object('revision',l.revision,'note',trim(note)));
end $$;
create function public.review_listing(lid uuid,expected_updated_at timestamptz,decision text,note text) returns void language sql security invoker set search_path='' as $$select pcx_private.review_listing(lid,expected_updated_at,decision,note)$$;
revoke execute on function pcx_private.review_listing(uuid,timestamptz,text,text),public.review_listing(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function pcx_private.review_listing(uuid,timestamptz,text,text),public.review_listing(uuid,timestamptz,text,text) to authenticated;
create function public.admin_listing_review_queue(term text default '',filter_status text default 'pending',page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if term is null or length(term)>150 or filter_status is null or filter_status not in ('all','draft','pending','approved','changes_requested','rejected') or page_number is null or page_number not between 1 and 10000 then raise exception 'Invalid queue filter'; end if;
 with filtered as (
 select l.id,l.review_submitted_at,jsonb_build_object('listing',to_jsonb(l)-'search_document','seller',jsonb_build_object('display_name',coalesce(c.display_name,p.full_name,''),'governorate',l.governorate)) item
 from public.marketplace_listings l join public.profiles p on p.id=l.seller_id left join public.profile_contacts c on c.user_id=l.seller_id
 where l.deleted_at is null and (filter_status='all' or l.review_status=filter_status) and (trim(term)='' or strpos(lower(l.reference_code),lower(trim(term)))>0 or strpos(l.id::text,lower(trim(term)))>0 or strpos(lower(l.title),lower(trim(term)))>0)
 ) select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(item) from (select item from filtered order by review_submitted_at desc nulls last,id desc limit 20 offset (page_number-1)*20) s),'[]'::jsonb)) into result;
 return result;
end $$;
revoke execute on function public.admin_listing_review_queue(text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_listing_review_queue(text,text,integer) to authenticated;
create or replace function public.submit_benchmark(uid uuid,lid uuid,expected_revision integer,object_path text,page_count integer) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.marketplace_listings; sid uuid;
begin
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Confirmed account required'; end if;
 select * into l from public.marketplace_listings where id=lid for update;
 if not found or l.seller_id<>uid or l.status not in ('listed','draft','pending_review','paused') or l.deleted_at is not null then raise exception 'Available listing ownership required'; end if;
 if l.revision<>expected_revision then raise exception 'Listing changed; upload evidence again'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,75));
 if object_path !~ ('^benchmarks/'||uid::text||'/'||lid::text||'/[a-f0-9-]+\.pdf$') or not exists(select 1 from storage.objects o where o.bucket_id='benchmark-evidence' and o.name=object_path) then raise exception 'Evidence object missing'; end if;
 if (select count(*) from public.benchmark_submissions b where b.seller_id=uid and b.submitted_at>now()-interval '1 day')>=10 then raise exception 'Daily evidence limit reached'; end if;
 insert into public.benchmark_submissions(listing_id,seller_id,revision,object_path,page_count,snapshot) values(lid,uid,l.revision,object_path,page_count,to_jsonb(l)-'search_document') returning id into sid;
 return sid;
end $$;

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
 if b.status<>'pending' or l.revision<>b.revision or l.deleted_at is not null or l.status not in ('listed','draft','pending_review','paused') then raise exception 'Submission is no longer reviewable'; end if;
 if (select id from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1)<>sid then raise exception 'Review the latest submission'; end if;
 update public.benchmark_submissions set status=decision,review_note=trim(note),reviewer_id=uid,reviewed_at=now(),expires_at=case when decision='approved' then now()+interval '90 days' else null end where id=sid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'benchmark.'||decision,sid,jsonb_build_object('listing_id',l.id,'revision',b.revision));
end $$;

-- Independent application queues, searched by product reference or UUID.
create or replace function public.admin_review_queue(queue_kind text,term text default '',filter_status text default 'all',page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if queue_kind is null or queue_kind not in ('benchmark','physical') or term is null or length(term)>150 or page_number is null or page_number not between 1 and 10000 then raise exception 'Invalid queue filter'; end if;
 if filter_status is null or
 (queue_kind='benchmark' and filter_status not in ('all','pending','approved','changes_requested','rejected','revoked')) or
 (queue_kind='physical' and filter_status not in ('all','active','requested','scheduled','completed','declined','cancelled')) then raise exception 'Invalid status'; end if;
 with applications as (
  select b.id,b.listing_id,b.status,b.submitted_at,to_jsonb(b) as application,b.revoked_at,
   (b.id=(select id from public.benchmark_submissions where listing_id=b.listing_id order by submitted_at desc,id desc limit 1)) as is_latest,null::uuid as report_id
  from public.benchmark_submissions b where queue_kind='benchmark'
  union all
  select r.id,r.listing_id,r.status,r.created_at,to_jsonb(r),null::timestamptz,true,f.id
  from public.inspection_requests r left join public.field_inspections f on f.request_id=r.id where queue_kind='physical'
 ), filtered as (
  select a.id,a.submitted_at,a.application,a.is_latest,a.report_id,
   jsonb_build_object('id',l.id,'reference_code',l.reference_code,'title',l.title,'category_slug',l.category_slug,'revision',l.revision,'status',l.status,'hidden',l.hidden,'deleted_at',l.deleted_at,'seller_id',l.seller_id,'review_status',l.review_status) as product,
   jsonb_build_object('display_name',coalesce(c.display_name,p.full_name,''),'governorate',l.governorate,'phone',coalesce(c.phone,''),'social_url',coalesce(c.social_url,'')) as applicant
  from applications a join public.marketplace_listings l on l.id=a.listing_id join public.profiles p on p.id=l.seller_id left join public.profile_contacts c on c.user_id=l.seller_id
  where (trim(term)='' or strpos(lower(l.reference_code),lower(trim(term)))>0 or strpos(lower(l.id::text),lower(trim(term)))>0)
   and (filter_status='all' or (filter_status='active' and a.status in ('requested','scheduled')) or (filter_status='revoked' and a.revoked_at is not null) or (filter_status=a.status and a.revoked_at is null))
 )
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(s)-'submitted_at') from (select * from filtered order by submitted_at desc,id desc limit 20 offset (page_number-1)*20) s),'[]'::jsonb)) into result;
 return result;
end $$;
revoke execute on function public.admin_review_queue(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_review_queue(text,text,text,integer) to authenticated;

notify pgrst,'reload schema';
