-- Commercial data is intentionally not seeded. Amounts are integer EGP piastres.
create type public.app_role as enum ('customer','seller','verified_seller','hardware_inspector','support_agent','administrator','super_administrator');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 100),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null, created_at timestamptz not null default now(),
  primary key (user_id,role)
);
create function public.has_role(required_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = required_role)
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('administrator') or public.has_role('super_administrator')
$$;
create function public.on_signup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name) values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100));
  insert into public.user_roles(user_id,role) values(new.id,'customer');
  return new;
end $$;
create trigger user_created after insert on auth.users for each row execute function public.on_signup();

create table public.categories (
  slug text primary key, name_en text not null, name_ar text not null,
  display_order integer not null unique
);
insert into public.categories values
  ('graphics-cards','Graphics cards','بطاقات الرسومات',1),('processors','Processors','المعالجات',2),
  ('motherboards','Motherboards','اللوحات الأم',3),('memory','Memory','الذاكرة',4),
  ('storage','Storage','التخزين',5),('power-supplies','Power supplies','مزودات الطاقة',6),
  ('cases','PC cases','صناديق الكمبيوتر',7),('cooling','Cooling','التبريد',8),
  ('monitors','Monitors','الشاشات',9),('peripherals','Peripherals','الملحقات',10),
  ('pc-builds','Complete builds','أجهزة كاملة',11),('other','Other components','مكونات أخرى',12);

create function public.valid_specs(value jsonb) returns boolean language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(value) <> 'object' then false else
   (select count(*) <= 40 and coalesce(bool_and(length(key) between 1 and 60 and jsonb_typeof(val) in ('string','number','boolean') and length(val::text) <= 1000),true) from jsonb_each(value) as t(key,val)) end
$$;
create table public.products (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  title text not null check(length(title) between 5 and 150), title_ar text check(length(title_ar) <= 150),
  category_slug text not null references public.categories(slug),
  brand text not null check(length(brand) between 1 and 60), model text not null check(length(model) between 1 and 100),
  description text not null check(length(description) between 15 and 5000), description_ar text check(length(description_ar) <= 5000),
  condition text not null check(condition in ('A','B','C','D')),
  price_piastres bigint not null check(price_piastres between 1 and 2000000000),
  warranty_months integer not null default 0 check(warranty_months between 0 and 60),
  governorate text not null check(length(governorate) between 2 and 60),
  specifications jsonb not null default '{}' check(public.valid_specs(specifications)),
  image_paths text[] not null default '{}' check(cardinality(image_paths) <= 8),
  status text not null default 'draft' check(status in ('draft','listed','archived')),
  hardware_revision integer not null default 1 check(hardware_revision > 0),
  search_document tsvector generated always as (to_tsvector('simple',coalesce(title,'')||' '||coalesce(title_ar,'')||' '||brand||' '||model||' '||description)) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_search on public.products using gin(search_document);
create index products_catalog on public.products(status,category_slug,created_at desc);
create index products_price on public.products(status,price_piastres);
create table public.inventory_items (
  product_id uuid primary key references public.products(id), sku text not null unique check(sku ~ '^[A-Za-z0-9_-]{3,60}$'),
  purchase_cost_piastres bigint not null check(purchase_cost_piastres between 0 and 2000000000),
  stock_on_hand integer not null check(stock_on_hand between 0 and 1000),
  reserved_quantity integer not null default 0 check(reserved_quantity >= 0 and reserved_quantity <= stock_on_hand),
  storage_location text not null default '', serial_number text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inspection_reports (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
  inspector_id uuid not null references public.profiles(id), condition text not null check(condition in ('A','B','C','D')),
  scope text not null check(length(scope) between 10 and 1000), findings text not null check(length(findings) between 10 and 5000),
  known_defects text not null default '' check(length(known_defects) <= 2000),
  tests jsonb not null check(public.valid_specs(tests) and tests <> '{}'), outcome text not null check(outcome in ('passed','failed')),
  hardware_revision integer not null, product_title text not null, product_brand text not null, product_model text not null,
  inspector_reference text not null,
  check(outcome <> 'passed' or condition <> 'D'),
  inspected_at timestamptz not null default now(), expires_at timestamptz not null check(expires_at > inspected_at)
);
create index inspection_product_date on public.inspection_reports(product_id,inspected_at desc);
create table public.inspection_private_notes (
  report_id uuid primary key references public.inspection_reports(id), notes text not null,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  idempotency_key uuid not null, status text not null default 'pending' check(status in ('pending','confirmed','ready','completed','cancelled')),
  payment_method text not null check(payment_method in ('cash_on_pickup','bank_transfer','instapay','mobile_wallet')),
  payment_status text not null default 'pending' check(payment_status in ('pending','submitted','verified')),
  total_piastres bigint not null check(total_piastres between 1 and 2000000000), phone text not null check(phone ~ '^(\+20|0)1[0125][0-9]{8}$'),
  fulfillment_method text not null default 'pickup' check(fulfillment_method = 'pickup'),
  payment_reference text check(length(payment_reference) between 3 and 200),
  verified_by uuid references public.profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key),
  check ((payment_status = 'verified') = (verified_by is not null and verified_at is not null))
);
create index orders_owner_date on public.orders(user_id,created_at desc);
create index orders_queue on public.orders(status,created_at);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  product_id uuid not null references public.products(id), title text not null,
  quantity integer not null check(quantity between 1 and 10), unit_price_piastres bigint not null check(unit_price_piastres > 0),
  unit_cost_piastres bigint not null check(unit_cost_piastres >= 0),
  created_at timestamptz not null default now(), unique(order_id,product_id)
);
create index order_items_product on public.order_items(product_id);
create table public.platform_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);
-- Only pickup cash is enabled until operations configures transfer destination details.
insert into public.platform_settings values ('payment_methods','["cash_on_pickup"]',now());
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  action text not null, entity_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_entity_date on public.audit_logs(entity_id,created_at desc);

-- Owner-executed view has an explicit publication filter and exposes only safe fields.
create view public.public_products with (security_barrier = true) as
select p.id,p.slug,p.title,p.title_ar,p.category_slug,p.brand,p.model,p.description,p.description_ar,p.condition,p.price_piastres,
 p.warranty_months,p.governorate,p.specifications,p.image_paths,p.created_at,p.search_document,
 greatest(i.stock_on_hand-i.reserved_quantity,0) as available_quantity,
 case when r.id is null then 'not_inspected' when r.outcome = 'failed' then 'verification_failed'
      when r.expires_at <= now() or r.hardware_revision <> p.hardware_revision then 'verification_expired' else 'platform_verified' end as verification_status,
 r.id as inspection_id
from public.products p join public.inventory_items i on i.product_id=p.id
left join lateral (select id,outcome,expires_at,hardware_revision from public.inspection_reports where product_id=p.id order by inspected_at desc,id desc limit 1) r on true
where p.status='listed';
create view public.public_inspection_reports with (security_barrier = true) as
 select r.id,r.product_id,r.condition,r.scope,r.findings,r.known_defects,r.tests,r.outcome,r.inspected_at,r.expires_at,
   r.product_title,r.product_brand,r.product_model,r.inspector_reference,
   (r.hardware_revision=p.hardware_revision) as current_revision
 from public.inspection_reports r join public.products p on p.id=r.product_id where p.status='listed';
create view public.customer_order_items with (security_barrier = true) as
 select i.id,i.order_id,i.product_id,i.title,i.quantity,i.unit_price_piastres
 from public.order_items i join public.orders o on o.id=i.order_id where o.user_id=(select auth.uid()) or public.is_admin();

create function public.save_inventory(data jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid; old_updated timestamptz; paths text[];
begin
 if not public.is_admin() then raise exception 'Inventory permission required' using errcode='42501'; end if;
 if jsonb_typeof(data) <> 'object' then raise exception 'Invalid inventory payload'; end if;
 select coalesce(array_agg(v), '{}') into paths from jsonb_array_elements_text(coalesce(data->'image_paths','[]')) v;
 if exists(select 1 from unnest(paths) path where path !~* '^products/[a-f0-9-]+/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$') then raise exception 'Invalid image storage path'; end if;
 pid := coalesce((data->>'id')::uuid,gen_random_uuid());
 if data->>'id' is not null then
   select updated_at into old_updated from public.products where id=pid for update;
   if not found then raise exception 'Product not found'; end if;
   if data->>'expected_updated_at' is null or old_updated <> (data->>'expected_updated_at')::timestamptz then raise exception 'Inventory changed. Reload before editing.'; end if;
   update public.products set title=data->>'title',title_ar=nullif(data->>'title_ar',''),category_slug=data->>'category_slug',brand=data->>'brand',model=data->>'model',
     description=data->>'description',description_ar=nullif(data->>'description_ar',''),condition=data->>'condition',price_piastres=(data->>'price_piastres')::bigint,
     warranty_months=(data->>'warranty_months')::int,governorate=data->>'governorate',specifications=data->'specifications',image_paths=paths,status=data->>'status',
     hardware_revision=hardware_revision+case when (title,title_ar,category_slug,brand,model,description,description_ar,condition,specifications,image_paths) is distinct from
       (data->>'title',nullif(data->>'title_ar',''),data->>'category_slug',data->>'brand',data->>'model',data->>'description',nullif(data->>'description_ar',''),data->>'condition',data->'specifications',paths) then 1 else 0 end,
     updated_at=clock_timestamp() where id=pid;
   update public.inventory_items set sku=data->>'sku',purchase_cost_piastres=(data->>'purchase_cost_piastres')::bigint,stock_on_hand=(data->>'quantity')::int,updated_at=now() where product_id=pid;
 else
   insert into public.products(id,slug,title,title_ar,category_slug,brand,model,description,description_ar,condition,price_piastres,warranty_months,governorate,specifications,image_paths,status)
   values(pid,lower(data->>'sku')||'-'||left(pid::text,8),data->>'title',nullif(data->>'title_ar',''),data->>'category_slug',data->>'brand',data->>'model',data->>'description',nullif(data->>'description_ar',''),data->>'condition',(data->>'price_piastres')::bigint,(data->>'warranty_months')::int,data->>'governorate',data->'specifications',paths,data->>'status');
   insert into public.inventory_items(product_id,sku,purchase_cost_piastres,stock_on_hand) values(pid,data->>'sku',(data->>'purchase_cost_piastres')::bigint,(data->>'quantity')::int);
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(auth.uid(),'inventory.saved',pid,jsonb_build_object('sku',data->>'sku','stock',data->'quantity','status',data->>'status'));
 return pid;
end $$;

create function public.publish_inspection(data jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid; days int; inspected_product public.products;
begin
 if not public.has_role('hardware_inspector') then raise exception 'Inspector permission required' using errcode='42501'; end if;
 days := (data->>'valid_days')::int;
 if days is null or days not between 1 and 180 then raise exception 'Invalid validity period'; end if;
 select * into inspected_product from public.products where id=(data->>'product_id')::uuid for update;
 if not found then raise exception 'Product not found'; end if;
 if inspected_product.condition is distinct from data->>'condition' then
   update public.products set condition=data->>'condition',hardware_revision=hardware_revision+1,updated_at=clock_timestamp()
   where id=inspected_product.id returning * into inspected_product;
 end if;
 insert into public.inspection_reports(product_id,inspector_id,condition,scope,findings,known_defects,tests,outcome,expires_at,hardware_revision,product_title,product_brand,product_model,inspector_reference)
 values(inspected_product.id,auth.uid(),data->>'condition',data->>'scope',data->>'findings',coalesce(data->>'known_defects',''),data->'tests',data->>'outcome',now()+make_interval(days=>days),inspected_product.hardware_revision,inspected_product.title,inspected_product.brand,inspected_product.model,'PCX-INS-'||left(auth.uid()::text,8)) returning id into rid;
 insert into public.audit_logs(actor_id,action,entity_id,details) values(auth.uid(),'inspection.published',rid,jsonb_build_object('product_id',data->>'product_id','outcome',data->>'outcome'));
 return rid;
end $$;

create function public.place_order(p_items jsonb,p_payment_method text,p_phone text,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare oid uuid; item record; product record; amount bigint := 0; uid uuid := auth.uid(); methods jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_idempotency_key is null then raise exception 'Idempotency key required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_idempotency_key::text,0));
 select id into oid from public.orders where user_id=uid and idempotency_key=p_idempotency_key;
 if found then return oid; end if;
 if (select count(*) from public.orders where user_id=uid and created_at > now()-interval '1 hour') >= 10 then raise exception 'Order limit reached. Please try later.'; end if;
 select value into methods from public.platform_settings where key='payment_methods';
 if not coalesce(methods ? p_payment_method,false) then raise exception 'Payment method is not enabled'; end if;
 if p_phone is null or p_phone !~ '^(\+20|0)1[0125][0-9]{8}$' then raise exception 'Invalid mobile number'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid cart'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'quantity') is distinct from 'number' or (x->>'quantity') !~ '^[1-9][0-9]?$' or (x->>'quantity')::int > 10 or x->>'product_id' is null or (select count(*) from jsonb_object_keys(x)) <> 2) then raise exception 'Invalid cart item'; end if;
 if (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then raise exception 'Duplicate cart items'; end if;
 oid := gen_random_uuid();
 -- Acquire product locks in a stable order to avoid deadlocks across multi-item carts.
 for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid,quantity int) order by product_id loop
   select p.title,p.price_piastres,i.purchase_cost_piastres,i.stock_on_hand,i.reserved_quantity into product
     from public.products p join public.inventory_items i on i.product_id=p.id where p.id=item.product_id and p.status='listed' for update of p,i;
   if not found or product.stock_on_hand-product.reserved_quantity < item.quantity then raise exception 'An item is unavailable or has insufficient stock'; end if;
   amount := amount + product.price_piastres*item.quantity;
   if amount > 2000000000 then raise exception 'Order value exceeds the supported limit'; end if;
 end loop;
 insert into public.orders(id,user_id,idempotency_key,payment_method,total_piastres,phone) values(oid,uid,p_idempotency_key,p_payment_method,amount,p_phone);
 for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid,quantity int) order by product_id loop
   insert into public.order_items(order_id,product_id,title,quantity,unit_price_piastres,unit_cost_piastres)
     select oid,p.id,p.title,item.quantity,p.price_piastres,i.purchase_cost_piastres from public.products p join public.inventory_items i on i.product_id=p.id where p.id=item.product_id;
   update public.inventory_items set reserved_quantity=reserved_quantity+item.quantity,updated_at=now() where product_id=item.product_id;
 end loop;
 insert into public.audit_logs(actor_id,action,entity_id) values(uid,'order.placed',oid);
 return oid;
end $$;

create function public.submit_payment_reference(p_order_id uuid,p_reference text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_reference is null or length(trim(p_reference)) not between 3 and 200 then raise exception 'Invalid payment reference'; end if;
 update public.orders set payment_reference=trim(p_reference),payment_status='submitted',updated_at=now()
   where id=p_order_id and user_id=auth.uid() and status not in ('cancelled','completed') and payment_status <> 'verified' and payment_method <> 'cash_on_pickup';
 if not found then raise exception 'Payment reference cannot be submitted'; end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'payment.reference_submitted',p_order_id);
end $$;

create function public.process_order(p_order_id uuid,p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare current_order public.orders; item record;
begin
 if not public.is_admin() then raise exception 'Order permission required' using errcode='42501'; end if;
 select * into current_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if current_order.status in ('completed','cancelled') then raise exception 'Order is already closed'; end if;
 if p_action='verify_payment' then
   if current_order.payment_status='verified' then return; end if;
   if current_order.payment_method <> 'cash_on_pickup' and current_order.payment_status <> 'submitted' then raise exception 'A payment reference is required'; end if;
   update public.orders set payment_status='verified',verified_by=auth.uid(),verified_at=now(),updated_at=now() where id=p_order_id;
 elsif p_action='confirm' then
   if current_order.status <> 'pending' then raise exception 'Only pending orders can be confirmed'; end if;
   update public.orders set status='confirmed',updated_at=now() where id=p_order_id;
 elsif p_action='ready' then
   if current_order.status <> 'confirmed' then raise exception 'Confirm order first'; end if;
   update public.orders set status='ready',updated_at=now() where id=p_order_id;
 elsif p_action in ('complete','cancel') then
   if p_action='complete' and (current_order.payment_status <> 'verified' or current_order.status <> 'ready') then raise exception 'Order must be ready and payment verified'; end if;
   if p_action='cancel' and current_order.payment_status='verified' then raise exception 'Paid orders require a refund workflow before cancellation'; end if;
   for item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
     perform 1 from public.inventory_items where product_id=item.product_id for update;
     update public.inventory_items set reserved_quantity=reserved_quantity-item.quantity,
       stock_on_hand=stock_on_hand-case when p_action='complete' then item.quantity else 0 end,updated_at=now() where product_id=item.product_id;
   end loop;
   update public.orders set status=case when p_action='complete' then 'completed' else 'cancelled' end,updated_at=now() where id=p_order_id;
 else raise exception 'Unknown action'; end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'order.'||p_action,p_order_id);
end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.inspection_private_notes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy own_profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy categories_read on public.categories for select to anon,authenticated using(true);
create policy product_read on public.products for select to authenticated using(public.is_admin() or public.has_role('hardware_inspector'));
create policy inventory_admin_read on public.inventory_items for select to authenticated using(public.is_admin());
create policy inspection_staff_read on public.inspection_reports for select to authenticated using(public.is_admin() or public.has_role('hardware_inspector'));
create policy private_inspector_notes on public.inspection_private_notes for select to authenticated using(public.has_role('hardware_inspector'));
create policy order_read on public.orders for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy order_cost_admin on public.order_items for select to authenticated using(public.is_admin());
create policy settings_read on public.platform_settings for select to anon,authenticated using(key='payment_methods');
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin());

revoke all on public.profiles,public.user_roles,public.categories,public.products,public.inventory_items,public.inspection_reports,public.inspection_private_notes,public.orders,public.order_items,public.platform_settings,public.audit_logs from anon,authenticated;
grant select on public.categories,public.public_products,public.public_inspection_reports,public.platform_settings to anon,authenticated;
grant select on public.profiles,public.user_roles,public.products,public.inventory_items,public.inspection_reports,public.inspection_private_notes,public.orders,public.order_items,public.audit_logs,public.customer_order_items to authenticated;
grant update(full_name) on public.profiles to authenticated;
revoke execute on function public.has_role(public.app_role),public.is_admin(),public.on_signup(),public.valid_specs(jsonb),public.save_inventory(jsonb),public.publish_inspection(jsonb),public.place_order(jsonb,text,text,uuid),public.submit_payment_reference(uuid,text),public.process_order(uuid,text) from public,anon,authenticated;
grant execute on function public.has_role(public.app_role),public.is_admin() to anon,authenticated;
grant execute on function public.valid_specs(jsonb),public.save_inventory(jsonb),public.publish_inspection(jsonb),public.place_order(jsonb,text,text,uuid),public.submit_payment_reference(uuid,text),public.process_order(uuid,text) to authenticated;
