-- Category metadata only; no commercial inventory is seeded.
update public.categories set display_order=13 where slug='other';
insert into public.categories(slug,name_en,name_ar,display_order)
values('laptops','Laptops','لابتوبات',12);

-- Match the seller form and server validation. Unknown/untested condition details
-- can be declared explicitly; this enforces disclosure, not a health claim.
create function public.valid_laptop(category text,specs jsonb)
returns boolean language sql immutable set search_path='' as $$
 select category<>'laptops' or not exists(
  select 1 from unnest(array['CPU','Graphics','RAM','Storage','Display','Battery condition','Charger','Keyboard layout','Boot status','Included accessories']) k
  where jsonb_typeof(specs->k) is distinct from 'string'
     or length(trim(specs->>k)) not between 1 and 500
 )
$$;
revoke execute on function public.valid_laptop(text,jsonb) from public,anon,authenticated;
grant execute on function public.valid_laptop(text,jsonb) to authenticated;
alter table public.marketplace_listings add constraint marketplace_laptop_details
 check(public.valid_laptop(category_slug,specifications));
