-- Peer-to-peer listings never enter company stock or checkout.
create schema if not exists pcx_private;
revoke all on schema pcx_private from public;
grant usage on schema pcx_private to authenticated;

create table public.account_roles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 role text not null default 'user' check(role in ('user','admin'))
);
insert into public.account_roles select p.id,case when exists(select 1 from public.user_roles r where r.user_id=p.id and r.role in ('administrator','super_administrator')) then 'admin' else 'user' end from public.profiles p;
alter table public.account_roles enable row level security;
create policy own_account_role on public.account_roles for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.account_roles from public,anon,authenticated;
grant select on public.account_roles to authenticated;
-- Legacy grants remain as historical records; active authorization uses exactly two roles.
revoke all on public.user_roles from anon,authenticated;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_roles where user_id=(select auth.uid()) and role='admin')
$$;
create or replace function public.has_role(required_role public.app_role) returns boolean language sql stable security definer set search_path='' as $$
 select case when required_role in ('administrator','super_administrator','hardware_inspector') then public.is_admin()
 else exists(select 1 from public.account_roles where user_id=(select auth.uid())) end
$$;
create or replace function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100));
 insert into public.account_roles(user_id) values(new.id);
 return new;
end $$;
create function pcx_private.confirmed_user() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Confirmed account required' using errcode='42501'; end if;
 return uid;
end $$;

create table public.profile_contacts (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 2 and 100),
 governorate text not null check(length(trim(governorate)) between 2 and 60),
 phone text not null default '' check(phone='' or phone ~ '^(\+20|0)1[0125][0-9]{8}$'),
 social_url text not null default '' check(social_url='' or social_url ~ '^https://(www\.)?(facebook\.com|instagram\.com|t\.me|wa\.me|m\.me)/[A-Za-z0-9._/?=&%+-]{1,250}$'),
 check(phone<>'' or social_url<>''), updated_at timestamptz not null default now()
);
alter table public.profile_contacts enable row level security;
create policy contacts_owner on public.profile_contacts for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.profile_contacts from public,anon,authenticated;
grant select on public.profile_contacts to authenticated;

create function public.valid_complete_pc(category text,specs jsonb) returns boolean language sql immutable set search_path='' as $$
 select category<>'pc-builds' or not exists(select 1 from unnest(array['CPU','Motherboard','RAM','Storage','PSU','Case','Cooling','Graphics','Boot status','Included accessories']) k where jsonb_typeof(specs->k) is distinct from 'string' or length(trim(specs->>k)) not between 1 and 500)
$$;
create table public.marketplace_listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id),
 title text not null check(length(trim(title)) between 5 and 150),
 category_slug text not null references public.categories(slug), brand text not null check(length(trim(brand)) between 1 and 60),
 model text not null check(length(trim(model)) between 1 and 100), description text not null check(length(trim(description)) between 15 and 5000),
 known_defects text not null check(length(trim(known_defects)) between 2 and 2000),
 condition text not null check(condition in ('A','B','C','D')), price_piastres bigint not null check(price_piastres between 1 and 2000000000),
 governorate text not null check(length(trim(governorate)) between 2 and 60),
 specifications jsonb not null default '{}' check(public.valid_specs(specifications)),
 image_paths text[] not null default '{}' check(cardinality(image_paths)<=8),
 status text not null default 'draft' check(status in ('draft','listed','sold','archived')),
 hidden boolean not null default false, revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(public.valid_complete_pc(category_slug,specifications)),
 search_document tsvector generated always as(to_tsvector('simple',title||' '||brand||' '||model||' '||description)) stored
);
create index marketplace_catalog_idx on public.marketplace_listings(status,hidden,category_slug,created_at desc);
create index marketplace_owner on public.marketplace_listings(seller_id,created_at desc);
create index marketplace_search on public.marketplace_listings using gin(search_document);
alter table public.marketplace_listings enable row level security;
create policy marketplace_read on public.marketplace_listings for select to anon,authenticated using((status='listed' and not hidden) or seller_id=(select auth.uid()) or public.is_admin());
revoke all on public.marketplace_listings from public,anon,authenticated;
grant select on public.marketplace_listings to anon,authenticated;

create table public.benchmark_submissions (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.marketplace_listings(id),
 seller_id uuid not null references public.profiles(id), revision integer not null,
 object_path text not null unique, page_count integer not null check(page_count between 1 and 12),
 snapshot jsonb not null, submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested','rejected')),
 review_note text not null default '' check(length(review_note)<=2000), reviewer_id uuid references public.profiles(id),
 reviewed_at timestamptz, expires_at timestamptz,
 check((status='pending' and reviewer_id is null and reviewed_at is null) or (status<>'pending' and reviewer_id is not null and reviewed_at is not null and length(trim(review_note))>=5)),
 check(reviewer_id is null or reviewer_id<>seller_id)
);
create index benchmark_listing on public.benchmark_submissions(listing_id,submitted_at desc,id desc);
create index benchmark_queue on public.benchmark_submissions(status,submitted_at);
alter table public.benchmark_submissions enable row level security;
create policy benchmark_read on public.benchmark_submissions for select to authenticated using(
 seller_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.status='listed' and not l.hidden and l.revision=benchmark_submissions.revision)
);
revoke all on public.benchmark_submissions from public,anon,authenticated;
grant select on public.benchmark_submissions to authenticated;

create function pcx_private.save_contact(data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user();
begin
 if exists(select 1 from jsonb_object_keys(data) k where k not in ('display_name','governorate','phone','social_url')) then raise exception 'Unexpected profile field'; end if;
 insert into public.profile_contacts(user_id,display_name,governorate,phone,social_url) values(uid,trim(data->>'display_name'),trim(data->>'governorate'),trim(coalesce(data->>'phone','')),trim(coalesce(data->>'social_url','')))
 on conflict(user_id) do update set display_name=excluded.display_name,governorate=excluded.governorate,phone=excluded.phone,social_url=excluded.social_url,updated_at=clock_timestamp();
 update public.profiles set full_name=trim(data->>'display_name') where id=uid;
end $$;
create function public.save_contact(data jsonb) returns void language sql security invoker set search_path='' as $$select pcx_private.save_contact(data)$$;

create function pcx_private.save_marketplace_listing(data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); lid uuid; old public.marketplace_listings; paths text[]; new_revision integer;
begin
 if exists(select 1 from jsonb_object_keys(data) k where k not in ('id','expected_updated_at','title','category_slug','brand','model','description','known_defects','condition','price_piastres','governorate','specifications','image_paths','status')) then raise exception 'Unexpected listing field'; end if;
 if not exists(select 1 from public.profile_contacts where user_id=uid) then raise exception 'Complete contact setup first'; end if;
 lid:=coalesce((data->>'id')::uuid,gen_random_uuid());
 if data->>'id' is not null then
  select * into old from public.marketplace_listings where id=lid for update;
  if not found or old.seller_id<>uid then raise exception 'Listing ownership required' using errcode='42501'; end if;
 end if;
 select coalesce(array_agg(v),'{}') into paths from jsonb_array_elements_text(coalesce(data->'image_paths','[]')) v;
 if exists(select 1 from unnest(paths) p where p !~ ('^marketplace/'||uid::text||'/[a-f0-9-]+\.webp$') or not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=p)) then raise exception 'Invalid listing image'; end if;
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
 return lid;
end $$;
create function public.save_marketplace_listing(data jsonb) returns uuid language sql security invoker set search_path='' as $$select pcx_private.save_marketplace_listing(data)$$;

create table pcx_private.contact_access(user_id uuid not null references public.profiles(id) on delete cascade, listing_id uuid not null references public.marketplace_listings(id), accessed_at timestamptz not null default now());
create index contact_access_limit on pcx_private.contact_access(user_id,accessed_at desc);
create function pcx_private.seller_contact(lid uuid) returns table(display_name text,phone text,social_url text,governorate text) language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(uid::text,74));
 if (select count(*) from pcx_private.contact_access where user_id=uid and accessed_at>now()-interval '1 hour')>=60 then raise exception 'Contact view limit reached'; end if;
 if not exists(select 1 from public.marketplace_listings where id=lid and status='listed' and not hidden) then raise exception 'Listing unavailable'; end if;
 insert into pcx_private.contact_access(user_id,listing_id) values(uid,lid);
 return query select c.display_name,c.phone,c.social_url,c.governorate from public.profile_contacts c join public.marketplace_listings l on l.seller_id=c.user_id where l.id=lid;
end $$;
create function public.seller_contact(lid uuid) returns table(display_name text,phone text,social_url text,governorate text) language sql security invoker set search_path='' as $$select * from pcx_private.seller_contact(lid)$$;

-- Only the trusted PC upload service may commit PDFs after rasterizing them.
create function public.submit_benchmark(uid uuid,lid uuid,expected_revision integer,object_path text,page_count integer) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.marketplace_listings; sid uuid;
begin
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Confirmed account required'; end if;
 select * into l from public.marketplace_listings where id=lid for update;
 if not found or l.seller_id<>uid or l.status<>'listed' or l.hidden then raise exception 'Published listing ownership required'; end if;
 if l.revision<>expected_revision then raise exception 'Listing changed; upload evidence again'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,75));
 if object_path !~ ('^benchmarks/'||uid::text||'/'||lid::text||'/[a-f0-9-]+\.pdf$') or not exists(select 1 from storage.objects o where o.bucket_id='benchmark-evidence' and o.name=object_path) then raise exception 'Evidence object missing'; end if;
 if (select count(*) from public.benchmark_submissions b where b.seller_id=uid and b.submitted_at>now()-interval '1 day')>=10 then raise exception 'Daily evidence limit reached'; end if;
 insert into public.benchmark_submissions(listing_id,seller_id,revision,object_path,page_count,snapshot) values(lid,uid,l.revision,object_path,page_count,to_jsonb(l)-'search_document') returning id into sid;
 return sid;
end $$;

create function pcx_private.review_benchmark(sid uuid,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user(); b public.benchmark_submissions; l public.marketplace_listings;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision not in ('approved','changes_requested','rejected') or length(trim(note)) not between 5 and 2000 then raise exception 'Decision and reason required'; end if;
 select * into b from public.benchmark_submissions where id=sid;
 if not found then raise exception 'Submission missing'; end if;
 select * into l from public.marketplace_listings where id=b.listing_id for update;
 select * into b from public.benchmark_submissions where id=sid for update;
 if b.seller_id=uid then raise exception 'Cannot review your own listing'; end if;
 if b.status<>'pending' or l.revision<>b.revision or l.hidden or l.status<>'listed' then raise exception 'Submission is no longer reviewable'; end if;
 if (select id from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1)<>sid then raise exception 'Review the latest submission'; end if;
 update public.benchmark_submissions set status=decision,review_note=trim(note),reviewer_id=uid,reviewed_at=now(),expires_at=case when decision='approved' then now()+interval '90 days' else null end where id=sid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'benchmark.'||decision,sid,jsonb_build_object('listing_id',l.id,'revision',b.revision));
end $$;
create function public.review_benchmark(sid uuid,decision text,note text) returns void language sql security invoker set search_path='' as $$select pcx_private.review_benchmark(sid,decision,note)$$;

create function pcx_private.moderate_listing(lid uuid,hide boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := pcx_private.confirmed_user();
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if length(trim(reason)) not between 5 and 500 then raise exception 'Moderation reason required'; end if;
 update public.marketplace_listings set hidden=hide,updated_at=clock_timestamp() where id=lid;
 if not found then raise exception 'Listing missing'; end if;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'marketplace.moderated',lid,jsonb_build_object('hidden',hide,'reason',reason));
end $$;
create function public.moderate_listing(lid uuid,hide boolean,reason text) returns void language sql security invoker set search_path='' as $$select pcx_private.moderate_listing(lid,hide,reason)$$;

-- Safe catalog projection; the owner-executed view exposes no contacts, file paths or private review data.
create view public.marketplace_catalog with(security_barrier=true) as
select l.id,l.title,l.category_slug,l.brand,l.model,l.description,l.known_defects,l.condition,l.price_piastres,l.governorate,l.specifications,l.image_paths,l.created_at,l.search_document,l.revision,
 case when b.status='approved' and b.revision=l.revision and b.expires_at>now() then 'benchmark_reviewed' else 'not_reviewed' end as benchmark_status,
 (b.revision=l.revision) as has_evidence
from public.marketplace_listings l left join lateral(select status,revision,expires_at from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1) b on true
where l.status='listed' and not l.hidden;
grant select on public.marketplace_catalog to anon,authenticated;
create view public.all_catalog_products with(security_barrier=true) as
 select p.*, 'company'::text as source, 'not_reviewed'::text as benchmark_status from public.public_products p
 union all
 select m.id,m.id::text,m.title,null::text,m.category_slug,m.brand,m.model,m.description,null::text,m.condition,m.price_piastres,
 0,m.governorate,m.specifications,m.image_paths,m.created_at,m.search_document,1,'not_inspected'::text,null::uuid,'seller'::text,m.benchmark_status
 from public.marketplace_catalog m;
grant select on public.all_catalog_products to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('marketplace-images','marketplace-images',true,3145728,array['image/webp']),
 ('benchmark-evidence','benchmark-evidence',false,3145728,array['application/pdf']);
create policy marketplace_photo_read on storage.objects for select to anon,authenticated using(bucket_id='marketplace-images');
create policy marketplace_photo_insert on storage.objects for insert to authenticated with check(bucket_id='marketplace-images' and name ~ ('^marketplace/'||(select auth.uid())::text||'/[a-f0-9-]+\.webp$'));
-- No user overwrite/delete, and no user upload to the evidence bucket. Only processed PDFs can be published.
create policy benchmark_file_read on storage.objects for select to authenticated using(bucket_id='benchmark-evidence' and exists(select 1 from public.benchmark_submissions b where b.object_path=name));

revoke all on all tables in schema pcx_private from public,anon,authenticated;
revoke execute on all functions in schema pcx_private from public,anon,authenticated;
grant execute on function pcx_private.confirmed_user(),pcx_private.save_contact(jsonb),pcx_private.save_marketplace_listing(jsonb),pcx_private.seller_contact(uuid),pcx_private.review_benchmark(uuid,text,text),pcx_private.moderate_listing(uuid,boolean,text) to authenticated;
revoke execute on function public.save_contact(jsonb),public.save_marketplace_listing(jsonb),public.seller_contact(uuid),public.submit_benchmark(uuid,uuid,integer,text,integer),public.review_benchmark(uuid,text,text),public.moderate_listing(uuid,boolean,text),public.valid_complete_pc(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_contact(jsonb),public.save_marketplace_listing(jsonb),public.seller_contact(uuid),public.review_benchmark(uuid,text,text),public.moderate_listing(uuid,boolean,text),public.valid_complete_pc(text,jsonb) to authenticated;
grant execute on function public.submit_benchmark(uuid,uuid,integer,text,integer) to service_role;
