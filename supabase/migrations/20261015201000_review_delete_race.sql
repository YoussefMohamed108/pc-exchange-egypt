-- Fail explicitly when permanent deletion wins the race with a review.
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
 if b.status<>'pending' or l.revision<>b.revision or l.deleted_at is not null or l.status not in ('listed','draft') then raise exception 'Submission is no longer reviewable'; end if;
 if (select id from public.benchmark_submissions where listing_id=l.id order by submitted_at desc,id desc limit 1)<>sid then raise exception 'Review the latest submission'; end if;
 update public.benchmark_submissions set status=decision,review_note=trim(note),reviewer_id=uid,reviewed_at=now(),expires_at=case when decision='approved' then now()+interval '90 days' else null end where id=sid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(uid,'benchmark.'||decision,sid,jsonb_build_object('listing_id',l.id,'revision',b.revision));
end $$;

notify pgrst,'reload schema';
