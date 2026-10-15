-- Independent application queues, searched by product reference or UUID.
create function public.admin_review_queue(queue_kind text,term text default '',filter_status text default 'all',page_number integer default 1)
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
   jsonb_build_object('id',l.id,'reference_code',l.reference_code,'title',l.title,'category_slug',l.category_slug,'revision',l.revision,'status',l.status,'hidden',l.hidden,'deleted_at',l.deleted_at,'seller_id',l.seller_id) as product,
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
