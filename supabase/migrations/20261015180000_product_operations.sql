-- Stable public references; removal is recoverable and never destroys order history.
create sequence pcx_private.product_reference_seq start 100001;
alter table public.products add column reference_number bigint not null default nextval('pcx_private.product_reference_seq'),
 add column reference_code text generated always as ('PCX-' || reference_number::text) stored unique,
 add column admin_paused boolean not null default false, add column deleted_at timestamptz;
alter table public.marketplace_listings add column reference_number bigint not null default nextval('pcx_private.product_reference_seq'),
 add column reference_code text generated always as ('PCX-' || reference_number::text) stored unique,
 add column deleted_at timestamptz;
alter table public.benchmark_submissions add column revoked_at timestamptz, add column revoked_reason text;
alter table public.inspection_reports add column revoked_at timestamptz, add column revoked_reason text;

create table public.inspection_requests (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
 requester_id uuid not null references public.profiles(id), revision integer not null,
 fee_piastres integer not null default 0 check(fee_piastres=0),
 status text not null default 'requested' check(status in ('requested','scheduled','completed','declined','cancelled')),
 availability_note text not null check(length(trim(availability_note)) between 5 and 500),
 scheduled_at timestamptz, admin_note text not null default '' check(length(admin_note)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_inspection on public.inspection_requests(listing_id) where status in ('requested','scheduled');
alter table public.inspection_requests enable row level security;
create policy inspection_request_read on public.inspection_requests for select to authenticated using(requester_id=(select auth.uid()) or public.is_admin());
revoke all on public.inspection_requests from public,anon,authenticated;
grant select on public.inspection_requests to authenticated;

create table public.field_inspections (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.inspection_requests(id) on delete cascade,
 listing_id uuid not null references public.marketplace_listings(id) on delete cascade, revision integer not null,
 inspector_id uuid not null references public.profiles(id), inspected_on date not null,
 product_title text not null, reference_code text not null, category_slug text not null,
 identity_description text not null check(length(trim(identity_description)) between 5 and 500),
 findings text not null check(length(trim(findings)) between 10 and 3000),
 known_defects text not null check(length(trim(known_defects)) between 2 and 2000),
 checks jsonb not null, photo_paths text[] not null check(cardinality(photo_paths) between 1 and 8),
 outcome text not null check(outcome in ('passed','failed','incomplete')),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 revoked_at timestamptz, revoked_reason text
);
create index field_inspection_latest on public.field_inspections(listing_id,created_at desc,id desc);
create table pcx_private.inspected_device_identity (
 report_id uuid primary key references public.field_inspections(id) on delete cascade,
 serial_number text not null check(length(trim(serial_number)) between 4 and 200)
);
alter table public.field_inspections enable row level security;
create policy field_inspection_staff on public.field_inspections for select to authenticated using(public.is_admin());
revoke all on public.field_inspections,pcx_private.inspected_device_identity from public,anon,authenticated;
grant select on public.field_inspections to authenticated;

create function pcx_private.guard_product_state() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.reference_number<>old.reference_number then raise exception 'Product reference is permanent'; end if;
 if old.deleted_at is not null and new.deleted_at is not null then raise exception 'Restore the product before editing'; end if;
 if tg_table_name='products' then
  if new.deleted_at is not null then new.status:='archived'; new.admin_paused:=true;
  elsif new.admin_paused then new.status:='draft'; end if;
 else
  if new.deleted_at is not null then new.status:='archived'; new.hidden:=true; end if;
  if new.revision<>old.revision or new.hidden or new.status<>'listed' then
   update public.inspection_requests set status='cancelled',admin_note='Listing changed or is unavailable. Request a new inspection when ready.',updated_at=clock_timestamp()
    where listing_id=new.id and status in ('requested','scheduled');
  end if;
 end if;
 return new;
end $$;
create trigger product_state_guard before update on public.products for each row execute function pcx_private.guard_product_state();
create trigger listing_state_guard before update on public.marketplace_listings for each row execute function pcx_private.guard_product_state();

create function public.inspection_checklist(category text) returns text[] language sql immutable set search_path='' as $$
 select array['identity','physical_condition','functional_test'] || case category
 when 'graphics-cards' then array['load_stability','temperatures','display_outputs']
 when 'processors' then array['load_stability','temperatures']
 when 'memory' then array['memory_test']
 when 'storage' then array['drive_health','read_write_test']
 when 'motherboards' then array['boot','slots_ports']
 when 'power-supplies' then array['load_stability','connectors']
 when 'cooling' then array['temperatures','fan_pump']
 when 'monitors' then array['display','display_outputs']
 when 'peripherals' then array['controls_ports']
 when 'cases' then array['mounts_ports']
 when 'pc-builds' then array['boot','load_stability','temperatures','memory_test','drive_health','slots_ports']
 when 'laptops' then array['boot','load_stability','temperatures','memory_test','drive_health','battery','display','keyboard_ports','charger']
 else array['category_specific_test'] end
$$;

create function public.request_field_inspection(lid uuid,expected_revision integer,note text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); l public.marketplace_listings; rid uuid;
begin
 select * into l from public.marketplace_listings where id=lid for update;
 if not found or l.seller_id<>uid or l.hidden or l.status<>'listed' or l.deleted_at is not null then raise exception 'Published listing ownership required' using errcode='42501'; end if;
 if l.revision is distinct from expected_revision then raise exception 'Listing changed'; end if;
 if (select count(*) from public.inspection_requests where listing_id=lid and created_at>now()-interval '1 day')>=3 then raise exception 'Daily request limit reached'; end if;
 insert into public.inspection_requests(listing_id,requester_id,revision,availability_note) values(lid,uid,l.revision,trim(note)) returning id into rid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'inspection.requested',lid,jsonb_build_object('request_id',rid,'fee_piastres',0));
 return rid;
end $$;

create function public.manage_inspection_request(rid uuid,decision text,note text,appointment timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); r public.inspection_requests; l public.marketplace_listings;
begin
 select * into r from public.inspection_requests where id=rid;
 select * into l from public.marketplace_listings where id=r.listing_id for update;
 select * into r from public.inspection_requests where id=rid for update;
 if not found or r.status not in ('requested','scheduled') then raise exception 'Request no longer active'; end if;
 if not public.is_admin() and (r.requester_id<>uid or decision<>'cancelled') then raise exception 'Admin required' using errcode='42501'; end if;
 if decision is null or decision not in ('scheduled','declined','cancelled') or note is null or length(trim(note)) not between 5 and 1000 then raise exception 'Decision and note required'; end if;
 if decision='scheduled' and (l.hidden or l.status<>'listed' or l.revision<>r.revision or appointment is null or appointment<now() or appointment>now()+interval '60 days') then raise exception 'Choose an available listing and future appointment within 60 days'; end if;
 update public.inspection_requests set status=decision,admin_note=trim(note),scheduled_at=case when decision='scheduled' then appointment else scheduled_at end,updated_at=clock_timestamp() where id=rid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'inspection.'||decision,l.id,jsonb_build_object('request_id',rid));
end $$;

create function public.publish_field_inspection(data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); r public.inspection_requests; l public.marketplace_listings; rid uuid; paths text[]; k text; check_value jsonb; visit_date date;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select * into r from public.inspection_requests where id=(data->>'request_id')::uuid;
 select * into l from public.marketplace_listings where id=r.listing_id for update;
 select * into r from public.inspection_requests where id=(data->>'request_id')::uuid for update;
 if not found or r.status<>'scheduled' or l.hidden or l.status<>'listed' or l.revision<>r.revision then raise exception 'Scheduled current listing required'; end if;
 if l.seller_id=uid then raise exception 'Cannot inspect your own listing'; end if;
 if data->>'attended' is distinct from 'yes' then raise exception 'Confirm the physical visit'; end if;
 visit_date:=(data->>'inspected_on')::date;
 if visit_date is null or visit_date<(r.created_at at time zone 'Africa/Cairo')::date or visit_date>(now() at time zone 'Africa/Cairo')::date then raise exception 'Invalid inspection date'; end if;
 if jsonb_typeof(data->'checks') is distinct from 'object' then raise exception 'Complete the checklist'; end if;
 foreach k in array public.inspection_checklist(l.category_slug) loop
  check_value:=data->'checks'->k;
  if check_value->>'result' is null or check_value->>'result' not in ('pass','fail','not_tested') or coalesce(length(trim(check_value->>'notes')),0) not between 3 and 500 then raise exception 'Every check needs a result and recorded observations'; end if;
  if data->>'outcome'='passed' and check_value->>'result'<>'pass' then raise exception 'All required checks must pass for the watermark'; end if;
 end loop;
 if exists(select 1 from jsonb_object_keys(data->'checks') key where key<>all(public.inspection_checklist(l.category_slug))) then raise exception 'Unexpected checklist item'; end if;
 select coalesce(array_agg(p),'{}') into paths from jsonb_array_elements_text(data->'photo_paths') p;
 if exists(select 1 from unnest(paths) p where p !~ ('^marketplace/'||uid::text||'/[a-f0-9-]+\.webp$') or not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p)) then raise exception 'Upload inspection photos using your admin account'; end if;
 insert into public.field_inspections(request_id,listing_id,revision,inspector_id,inspected_on,product_title,reference_code,category_slug,identity_description,findings,known_defects,checks,photo_paths,outcome,expires_at)
 values(r.id,l.id,l.revision,uid,visit_date,l.title,l.reference_code,l.category_slug,trim(data->>'identity_description'),trim(data->>'findings'),trim(data->>'known_defects'),data->'checks',paths,data->>'outcome',(visit_date+90)::timestamp at time zone 'Africa/Cairo') returning id into rid;
 insert into pcx_private.inspected_device_identity values(rid,trim(data->>'serial_number'));
 update public.inspection_requests set status='completed',updated_at=clock_timestamp() where id=r.id;
 update public.marketplace_listings set updated_at=clock_timestamp() where id=l.id;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'inspection.published',l.id,jsonb_build_object('report_id',rid,'outcome',data->>'outcome'));
 return rid;
end $$;

create function public.admin_product_action(source text,pid uuid,expected_updated_at timestamptz,operation text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=pcx_private.confirmed_user(); stamp timestamptz; removed timestamptz; state text;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if source is null or source not in ('seller','company') or operation is null or operation not in ('pause','resume','delete','restore','revoke_benchmark','revoke_inspection') or reason is null or length(trim(reason)) not between 5 and 500 then raise exception 'Valid operation and reason required'; end if;
 if source='seller' then select updated_at,deleted_at,status into stamp,removed,state from public.marketplace_listings where id=pid for update;
 else select updated_at,deleted_at,status into stamp,removed,state from public.products where id=pid for update; end if;
 if not found or stamp is distinct from expected_updated_at then raise exception 'Product changed; reload before managing it'; end if;
 if removed is not null and operation<>'restore' then raise exception 'Restore first'; end if;
 if operation='restore' and removed is null then raise exception 'Product is not deleted'; end if;
 if operation='resume' and source='seller' and state<>'listed' then raise exception 'Only a seller-published listing can resume'; end if;
 if source='seller' then
  if operation='pause' then update public.marketplace_listings set hidden=true,updated_at=clock_timestamp() where id=pid;
  elsif operation='resume' then update public.marketplace_listings set hidden=false,updated_at=clock_timestamp() where id=pid;
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

create view public.public_field_inspections with(security_barrier=true) as
 select f.id,f.listing_id,f.product_title,f.reference_code,f.category_slug,f.inspected_on,f.identity_description,f.findings,f.known_defects,f.checks,f.photo_paths,f.outcome,f.expires_at,f.revoked_at,f.revoked_reason,
 (f.revision=l.revision) as current_revision,
 (f.id=(select id from public.field_inspections where listing_id=l.id order by created_at desc,id desc limit 1)) as latest_report,
 (f.expires_at>now()) as unexpired
 from public.field_inspections f join public.marketplace_listings l on l.id=f.listing_id where l.status='listed' and not l.hidden and l.deleted_at is null;
grant select on public.public_field_inspections to anon,authenticated;

create or replace view public.public_products with(security_barrier=true) as
select p.id,p.slug,p.title,p.title_ar,p.category_slug,p.brand,p.model,p.description,p.description_ar,p.condition,p.price_piastres,
 p.warranty_months,p.governorate,p.specifications,p.image_paths,p.created_at,p.search_document,
 greatest(i.stock_on_hand-i.reserved_quantity,0) as available_quantity,
 case when r.id is null then 'not_inspected' when r.revoked_at is not null then 'verification_expired' when r.outcome='failed' then 'verification_failed'
 when r.expires_at<=now() or r.hardware_revision<>p.hardware_revision then 'verification_expired' else 'platform_verified' end as verification_status,
 r.id as inspection_id,p.reference_code
from public.products p join public.inventory_items i on i.product_id=p.id
left join lateral(select id,outcome,expires_at,hardware_revision,revoked_at from public.inspection_reports where product_id=p.id order by inspected_at desc,id desc limit 1) r on true
where p.status='listed' and not p.admin_paused and p.deleted_at is null;
create or replace view public.public_inspection_reports with(security_barrier=true) as
 select r.id,r.product_id,r.condition,r.scope,r.findings,r.known_defects,r.tests,r.outcome,r.inspected_at,r.expires_at,
 r.product_title,r.product_brand,r.product_model,r.inspector_reference,
 (r.hardware_revision=p.hardware_revision and r.revoked_at is null) as current_revision,r.revoked_at,r.revoked_reason
 from public.inspection_reports r join public.products p on p.id=r.product_id where p.status='listed' and not p.admin_paused and p.deleted_at is null;
create or replace view public.marketplace_catalog with(security_barrier=true) as
select l.id,l.title,l.category_slug,l.brand,l.model,l.description,l.known_defects,l.condition,l.price_piastres,l.governorate,l.specifications,l.image_paths,l.created_at,l.search_document,l.revision,
 case when b.status='approved' and b.revision=l.revision and b.expires_at>now() and b.revoked_at is null then 'benchmark_reviewed' else 'not_reviewed' end as benchmark_status,
 (b.revision=l.revision) as has_evidence,l.reference_code,
 case when f.id is null then 'not_inspected' when f.revoked_at is not null or f.expires_at<=now() or f.revision<>l.revision then 'verification_expired' when f.outcome<>'passed' then 'verification_failed' else 'platform_verified' end as verification_status,
 f.id as inspection_id
from public.marketplace_listings l
left join lateral(select * from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1) b on true
left join lateral(select * from public.field_inspections where listing_id=l.id order by created_at desc,id desc limit 1) f on true
where l.status='listed' and not l.hidden and l.deleted_at is null;
create or replace view public.all_catalog_products with(security_barrier=true) as
 select p.id,p.slug,p.title,p.title_ar,p.category_slug,p.brand,p.model,p.description,p.description_ar,p.condition,p.price_piastres,
 p.warranty_months,p.governorate,p.specifications,p.image_paths,p.created_at,p.search_document,p.available_quantity,p.verification_status,p.inspection_id,'company'::text as source,'not_reviewed'::text as benchmark_status,p.reference_code from public.public_products p
 union all
 select m.id,m.id::text,m.title,null::text,m.category_slug,m.brand,m.model,m.description,null::text,m.condition,m.price_piastres,
 0,m.governorate,m.specifications,m.image_paths,m.created_at,m.search_document,1,m.verification_status,m.inspection_id,'seller'::text,m.benchmark_status,m.reference_code from public.marketplace_catalog m;

-- Explicit admin-only projection, including paused/deleted products, with bounded pagination.
create function public.admin_find_products(term text default '',kind text default 'all',state text default 'all',page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if length(term)>150 or kind not in ('all','seller','company') or state not in ('all','listed','draft','sold','archived','paused','deleted','inspection') or page_number not between 1 and 10000 then raise exception 'Invalid filter'; end if;
 with items as (
 select l.id,l.reference_code,l.title,l.brand,l.model,l.category_slug,l.price_piastres,l.status,l.hidden as paused,l.deleted_at,l.updated_at,'seller'::text as source,''::text as sku,
 exists(select 1 from public.inspection_requests r where r.listing_id=l.id and r.status in ('requested','scheduled')) as inspection_pending
 from public.marketplace_listings l
 union all
 select p.id,p.reference_code,p.title,p.brand,p.model,p.category_slug,p.price_piastres,p.status,p.admin_paused,p.deleted_at,p.updated_at,'company',coalesce(i.sku,''),false from public.products p left join public.inventory_items i on i.product_id=p.id
 ), filtered as (select * from items x where (kind='all' or source=kind)
 and (term='' or strpos(lower(x.reference_code||' '||x.id::text||' '||x.title||' '||x.brand||' '||x.model||' '||x.sku),lower(trim(term)))>0)
 and (state='all' or (state='deleted' and deleted_at is not null) or (state='paused' and paused and deleted_at is null) or (state='inspection' and inspection_pending) or (state=status and deleted_at is null and not paused)))
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(s)) from (select * from filtered order by updated_at desc,id limit 25 offset (page_number-1)*25) s),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.admin_product_contact(lid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform pcx_private.confirmed_user();
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 return (select jsonb_build_object('display_name',c.display_name,'phone',c.phone,'social_url',c.social_url,'governorate',c.governorate) from public.profile_contacts c join public.marketplace_listings l on l.seller_id=c.user_id where l.id=lid);
end $$;

revoke execute on function pcx_private.guard_product_state() from public,anon,authenticated;
revoke execute on function public.request_field_inspection(uuid,integer,text),public.manage_inspection_request(uuid,text,text,timestamptz),public.publish_field_inspection(jsonb),public.admin_product_action(text,uuid,timestamptz,text,text),public.admin_find_products(text,text,text,integer),public.admin_product_contact(uuid) from public,anon,authenticated;
grant execute on function public.request_field_inspection(uuid,integer,text),public.manage_inspection_request(uuid,text,text,timestamptz),public.publish_field_inspection(jsonb),public.admin_product_action(text,uuid,timestamptz,text,text),public.admin_find_products(text,text,text,integer),public.admin_product_contact(uuid) to authenticated;
notify pgrst,'reload schema';

-- Owners retain their existing photos; admins can edit with the same validation and revision rules.
create or replace function pcx_private.save_marketplace_listing(data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); lid uuid; old public.marketplace_listings; paths text[]; new_revision integer;
begin
 if exists(select 1 from jsonb_object_keys(data) k where k not in ('id','expected_updated_at','title','category_slug','brand','model','description','known_defects','condition','price_piastres','governorate','specifications','image_paths','status')) then raise exception 'Unexpected listing field'; end if;
 if not exists(select 1 from public.profile_contacts where user_id=uid) then raise exception 'Complete contact setup first'; end if;
 lid:=coalesce((data->>'id')::uuid,gen_random_uuid());
 if data->>'id' is not null then
  select * into old from public.marketplace_listings where id=lid for update;
  if not found or (old.seller_id<>uid and not public.is_admin()) then raise exception 'Listing ownership required' using errcode='42501'; end if;
 end if;
 select coalesce(array_agg(v),'{}') into paths from jsonb_array_elements_text(coalesce(data->'image_paths','[]')) v;
 if exists(select 1 from unnest(paths) p where (p !~ ('^marketplace/'||uid::text||'/[a-f0-9-]+\.webp$') and not coalesce(p=any(old.image_paths),false)) or not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p)) then raise exception 'Invalid listing image'; end if;
 if data->>'status'='listed' and cardinality(paths)=0 then raise exception 'Add at least one photo before publishing'; end if;
 if data->>'id' is not null then
  if old.updated_at is distinct from (data->>'expected_updated_at')::timestamptz then raise exception 'Listing changed; reload before editing'; end if;
  new_revision:=old.revision+case when (old.title,old.category_slug,old.brand,old.model,old.description,old.known_defects,old.condition,old.specifications,old.image_paths) is distinct from
   (data->>'title',data->>'category_slug',data->>'brand',data->>'model',data->>'description',data->>'known_defects',data->>'condition',data->'specifications',paths) then 1 else 0 end;
  update public.marketplace_listings set title=data->>'title',category_slug=data->>'category_slug',brand=data->>'brand',model=data->>'model',description=data->>'description',known_defects=data->>'known_defects',condition=data->>'condition',price_piastres=(data->>'price_piastres')::bigint,governorate=data->>'governorate',specifications=data->'specifications',image_paths=paths,status=data->>'status',revision=new_revision,updated_at=clock_timestamp() where id=lid;
 else
  perform pg_advisory_xact_lock(hashtextextended(uid::text,73));
  if (select count(*) from public.marketplace_listings where seller_id=uid and created_at>now()-interval '1 day')>=20 then raise exception 'Daily listing limit reached'; end if;
  insert into public.marketplace_listings(id,seller_id,title,category_slug,brand,model,description,known_defects,condition,price_piastres,governorate,specifications,image_paths,status)
   values(lid,uid,data->>'title',data->>'category_slug',data->>'brand',data->>'model',data->>'description',data->>'known_defects',data->>'condition',(data->>'price_piastres')::bigint,data->>'governorate',data->'specifications',paths,data->>'status');
 end if;
 if public.is_admin() and old.seller_id is not null and old.seller_id<>uid then
  insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'product.edited',lid,jsonb_build_object('revision',new_revision));
 end if;
 return lid;
end $$;

-- Admin edits use the same validation and revision rules. Owners retain existing photos.
create or replace function pcx_private.save_marketplace_listing(data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); lid uuid; old public.marketplace_listings; paths text[]; new_revision integer;
begin
 if exists(select 1 from jsonb_object_keys(data) k where k not in ('id','expected_updated_at','title','category_slug','brand','model','description','known_defects','condition','price_piastres','governorate','specifications','image_paths','status')) then raise exception 'Unexpected listing field'; end if;
 if not (public.is_admin() and data->>'id' is not null) and not exists(select 1 from public.profile_contacts where user_id=uid) then raise exception 'Complete contact setup first'; end if;
 lid:=coalesce((data->>'id')::uuid,gen_random_uuid());
 if data->>'id' is not null then
  select * into old from public.marketplace_listings where id=lid for update;
  if not found or (old.seller_id<>uid and not public.is_admin()) then raise exception 'Listing ownership required' using errcode='42501'; end if;
 end if;
 select coalesce(array_agg(v),'{}') into paths from jsonb_array_elements_text(coalesce(data->'image_paths','[]')) v;
 if exists(select 1 from unnest(paths) p where (p !~ ('^marketplace/'||uid::text||'/[a-f0-9-]+\.webp$') and not coalesce(p=any(old.image_paths),false)) or not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p)) then raise exception 'Invalid listing image'; end if;
 if data->>'status'='listed' and cardinality(paths)=0 then raise exception 'Add at least one photo before publishing'; end if;
 if data->>'id' is not null then
  if old.updated_at is distinct from (data->>'expected_updated_at')::timestamptz then raise exception 'Listing changed; reload before editing'; end if;
  new_revision:=old.revision+case when (old.title,old.category_slug,old.brand,old.model,old.description,old.known_defects,old.condition,old.specifications,old.image_paths) is distinct from
   (data->>'title',data->>'category_slug',data->>'brand',data->>'model',data->>'description',data->>'known_defects',data->>'condition',data->'specifications',paths) then 1 else 0 end;
  update public.marketplace_listings set title=data->>'title',category_slug=data->>'category_slug',brand=data->>'brand',model=data->>'model',description=data->>'description',known_defects=data->>'known_defects',condition=data->>'condition',price_piastres=(data->>'price_piastres')::bigint,governorate=data->>'governorate',specifications=data->'specifications',image_paths=paths,status=data->>'status',revision=new_revision,updated_at=clock_timestamp() where id=lid;
 else
  perform pg_advisory_xact_lock(hashtextextended(uid::text,73));
  if (select count(*) from public.marketplace_listings where seller_id=uid and created_at>now()-interval '1 day')>=20 then raise exception 'Daily listing limit reached'; end if;
  insert into public.marketplace_listings(id,seller_id,title,category_slug,brand,model,description,known_defects,condition,price_piastres,governorate,specifications,image_paths,status)
   values(lid,uid,data->>'title',data->>'category_slug',data->>'brand',data->>'model',data->>'description',data->>'known_defects',data->>'condition',(data->>'price_piastres')::bigint,data->>'governorate',data->'specifications',paths,data->>'status');
 end if;
 if public.is_admin() and old.seller_id is not null and old.seller_id<>uid then
  insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'product.edited',lid,jsonb_build_object('revision',new_revision));
 end if;
 return lid;
end $$;
