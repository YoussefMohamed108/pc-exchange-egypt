import { PermanentDeleteForm } from "@/components/permanent-delete-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getBenchmarks } from "@/lib/marketplace";
import type { SellerListing } from "@/lib/marketplace-validation";
import type { InspectionRequest } from "@/lib/inspections";
import { ListingForm } from "@/components/listing-form";
import { ProductControls } from "@/components/product-operations-forms";
import { InspectionForm } from "@/components/inspection-form";
import { requestStatus } from "@/lib/inspections";
import { ListingReviewState, ListingReviewForm } from "@/components/listing-review";
export default async function ManageProduct({
  params,
}: {
  params: Promise<{ locale: string; source: string; id: string }>;
}) {
  const { locale, source, id } = await params;
  if (!isLocale(locale) || !["seller", "company"].includes(source) || !/^[a-f0-9-]{36}$/i.test(id))
    notFound();
  await requireStaff(locale);
  const client = await createSupabaseClient();
  if (!client) notFound();
  const { data: raw, error } = await client
    .from(source === "seller" ? "marketplace_listings" : "products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Product could not be loaded.");
  if (!raw) notFound();
  const p = raw as Omit<SellerListing, "seller_id" | "hidden" | "revision"> & {
    seller_id?: string;
    hidden?: boolean;
    revision?: number;
    admin_paused?: boolean;
    slug?: string;
  };
  const [requests, reports, contact, audit] = await Promise.all([
    source === "seller"
      ? client
          .from("inspection_requests")
          .select("*")
          .eq("listing_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    source === "seller"
      ? client
          .from("field_inspections")
          .select("id,outcome,revoked_at,expires_at")
          .eq("listing_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : client
          .from("inspection_reports")
          .select("id,outcome,revoked_at,expires_at")
          .eq("product_id", id)
          .order("inspected_at", { ascending: false })
          .limit(20),
    source === "seller"
      ? client.rpc("admin_product_contact", { lid: id })
      : Promise.resolve({ data: null, error: null }),
    client
      .from("audit_logs")
      .select("id,action,details,created_at")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (requests.error || reports.error || contact.error || audit.error)
    throw new Error("Product management records could not be loaded.");
  const benchmarks = source === "seller" ? await getBenchmarks(id) : [];
  const active = (requests.data as InspectionRequest[]).find((r) =>
    ["requested", "scheduled"].includes(r.status),
  );
  const ar = locale === "ar";
  return (
    <div className="product-management">
      <Link href={`/${locale}/admin/products`}>← {ar ? "كل المنتجات" : "All products"}</Link>
      <header>
        <div className="eyebrow">{p.reference_code}</div>
        <h1>{p.title}</h1>
        <p>
          <code>{id}</code>
        </p>
        <p>
          {ar ? "الحالة: " : "State: "}
          {p.deleted_at
            ? ar
              ? "محذوف"
              : "Deleted"
            : p.hidden || p.admin_paused
              ? ar
                ? "موقوف"
                : "Paused"
              : p.status}
        </p>
      </header>
      {p.status === "listed" &&
        (source !== "seller" || p.review_status === "approved") &&
        !p.hidden &&
        !p.admin_paused &&
        !p.deleted_at && (
          <Link
            href={
              source === "seller" ? `/${locale}/listings/${id}` : `/${locale}/products/${p.slug}`
            }
          >
            {ar ? "عرض صفحة المنتج" : "View product page"} ↗
          </Link>
        )}
      {source === "seller" && (
        <section className="panel" id="listing-review">
          <ListingReviewState locale={locale} listing={p as SellerListing} />
          <Link
            href={`/${locale}/admin/listings?${new URLSearchParams({ q: p.reference_code, status: "all" })}`}
          >
            {ar ? "مراجعة نشر الإعلان" : "Listing publication reviews"} ↗
          </Link>
          {p.review_status === "pending" && !p.deleted_at && (
            <ListingReviewForm key={p.updated_at} locale={locale} listing={p as SellerListing} />
          )}
        </section>
      )}
      <ProductControls
        key={p.updated_at}
        locale={locale}
        source={source as "seller" | "company"}
        id={id}
        updatedAt={p.updated_at}
        deleted={!!p.deleted_at}
        paused={!!(p.hidden || p.admin_paused)}
        status={p.status}
      />
      {!p.deleted_at && (
        <details className="panel">
          <summary>{ar ? "تعديل تفاصيل المنتج" : "Edit product details"}</summary>
          <p>
            {ar
              ? "تغيير المكونات أو الوصف أو الحالة أو العيوب أو الصور يتطلب مراجعة النشر مجددًا ويلغي العلامات السابقة."
              : "Changing hardware details, descriptions, condition, defects or photos requires publication review again and invalidates previous watermarks."}
          </p>
          {source === "seller" ? (
            <ListingForm
              key={p.updated_at}
              locale={locale}
              listing={p as SellerListing}
              governorate={p.governorate}
              adminMode
            />
          ) : (
            <Link href={`/${locale}/admin/inventory/${id}`}>
              {ar ? "تعديل المخزون والسعر والتفاصيل" : "Edit stock, price and details"} ↗
            </Link>
          )}
        </details>
      )}
      {contact.data && (
        <section className="panel">
          <h2>{ar ? "تواصل البائع (خاص بالإدارة)" : "Seller contact for arranging inspection"}</h2>
          <p>
            {contact.data.display_name} · {contact.data.governorate}
          </p>
          {contact.data.phone && <p dir="ltr">{contact.data.phone}</p>}
          {contact.data.social_url && (
            <a href={contact.data.social_url} target="_blank" rel="noopener noreferrer">
              {ar ? "رابط التواصل" : "Contact link"} ↗
            </a>
          )}
        </section>
      )}
      {source === "seller" && (
        <section className="panel" id="benchmark-reviews">
          <h2>{ar ? "مراجعة الاختبارات" : "Benchmark reviews"}</h2>
          <p>
            {benchmarks.length
              ? ar
                ? "تم إرسال أدلة PDF لهذا المنتج."
                : "Benchmark PDFs have been submitted for this product."
              : ar
                ? "لم تُرسل أدلة PDF لهذا المنتج."
                : "No benchmark PDF submitted for this product."}
          </p>
          <Link
            href={`/${locale}/admin/benchmarks?${new URLSearchParams({ q: p.reference_code, status: "all" })}`}
          >
            {ar ? "إدارة مراجعات الاختبارات" : "Manage benchmark reviews"} · {p.reference_code} ↗
          </Link>
        </section>
      )}
      <section className="panel" id="physical-inspections">
        <h2>{ar ? "الفحص الميداني" : "Physical inspections"}</h2>
        {source === "seller" ? (
          <>
            <p>{ar ? "مجاني خلال فترة الإطلاق." : "Free during the launch period."}</p>
            {!requests.data?.length && (
              <p>
                {ar ? "لم يطلب البائع فحصًا بعد." : "The seller has not requested an inspection."}
              </p>
            )}
            {active && (
              <p>
                {ar ? "حالة الطلب النشط: " : "Active request: "}
                {requestStatus(active.status, locale)}
              </p>
            )}
            <Link
              href={`/${locale}/admin/inspections?${new URLSearchParams({ q: p.reference_code, status: "all" })}`}
            >
              {ar ? "إدارة طلبات الفحص الميداني" : "Manage physical inspections"} ·{" "}
              {p.reference_code} ↗
            </Link>
          </>
        ) : (
          !p.deleted_at && (
            <details>
              <summary>
                {ar ? "إنشاء تقرير فحص لمخزون الشركة" : "Create a company-stock inspection report"}
              </summary>
              <InspectionForm
                locale={locale}
                products={[{ id, title: p.title, reference_code: p.reference_code }]}
                selectedProduct={id}
              />
            </details>
          )
        )}
        {source === "company" &&
          reports.data?.map((r) => (
            <p key={r.id}>
              <Link href={`/${locale}/reports/${r.id}`}>
                {ar ? "تقرير" : "Report"} · {r.outcome}
              </Link>
              {r.revoked_at && ` · ${ar ? "تم سحب العلامة" : "Watermark revoked"}`}
            </p>
          ))}
      </section>
      <section className="panel">
        <h2>{ar ? "آخر الإجراءات الإدارية" : "Recent management history"}</h2>
        <p className="field-hint">{ar ? "آخر ٣٠ إجراء." : "Latest 30 actions."}</p>
        {audit.data?.length ? (
          audit.data.map((a) => (
            <div className="audit-entry" key={a.id}>
              <strong>{a.action}</strong>
              <time>
                {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Cairo",
                }).format(new Date(a.created_at))}
              </time>
              {typeof a.details?.reason === "string" && <p>{a.details.reason}</p>}
            </div>
          ))
        ) : (
          <p>{ar ? "لا توجد إجراءات مسجلة." : "No management actions recorded."}</p>
        )}
      </section>
      <PermanentDeleteForm
        locale={locale}
        source={source as "seller" | "company"}
        id={id}
        referenceCode={p.reference_code}
        updatedAt={p.updated_at}
      />
    </div>
  );
}
