-- Admins retain report access after pausing or deleting a product.
create or replace view public.public_field_inspections with(security_barrier=true) as
 select f.id,f.listing_id,f.product_title,f.reference_code,f.category_slug,f.inspected_on,f.identity_description,f.findings,f.known_defects,f.checks,f.photo_paths,f.outcome,f.expires_at,f.revoked_at,f.revoked_reason,
 (f.revision=l.revision) as current_revision,
 (f.id=(select id from public.field_inspections where listing_id=l.id order by created_at desc,id desc limit 1)) as latest_report,
 (f.expires_at>now()) as unexpired
 from public.field_inspections f join public.marketplace_listings l on l.id=f.listing_id where (l.status='listed' and not l.hidden and l.deleted_at is null) or public.is_admin();
create or replace view public.public_inspection_reports with(security_barrier=true) as
 select r.id,r.product_id,r.condition,r.scope,r.findings,r.known_defects,r.tests,r.outcome,r.inspected_at,r.expires_at,
 r.product_title,r.product_brand,r.product_model,r.inspector_reference,
 (r.hardware_revision=p.hardware_revision and r.revoked_at is null) as current_revision,r.revoked_at,r.revoked_reason
 from public.inspection_reports r join public.products p on p.id=r.product_id where (p.status='listed' and not p.admin_paused and p.deleted_at is null) or public.is_admin();

notify pgrst,'reload schema';
