import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { getSellerListing, getBenchmarks } from "@/lib/marketplace";
import { ListingForm } from "@/components/listing-form";
import { EvidenceForm } from "@/components/benchmark-forms";
import { BenchmarkHistory } from "@/components/benchmark-history";
import { createSupabaseClient } from "@/lib/supabase/server";
import {
  InspectionRequestForm,
  InspectionRequestCard,
} from "@/components/product-operations-forms";
import type { InspectionRequest } from "@/lib/inspections";
import { SellerListingControls } from "@/components/seller-listing-controls";
import { ListingReviewState } from "@/components/listing-review";
export const metadata = { title: "Manage listing", robots: { index: false, follow: false } };
export default async function EditListing({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const a = await requireUser(locale, `/${locale}/account/listings/${id}`);
  const listing = await getSellerListing(id);
  if (!listing || listing.seller_id !== a.user!.id) notFound();
  const client = await createSupabaseClient();
  const [b, requests, history] = await Promise.all([
    getBenchmarks(id),
    client!
      .from("inspection_requests")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    client!
      .from("listing_review_history")
      .select("*")
      .eq("listing_id", id)
      .order("reviewed_at", { ascending: false }),
  ]);
  if (history.error) throw new Error("Listing review history could not be loaded.");
  if (requests.error) throw new Error("Inspection requests could not be loaded.");
  const active = requests.data.some((r) => ["requested", "scheduled"].includes(r.status));
  const ar = locale === "ar";
  return (
    <div className="container content-section market-page">
      <Link href={`/${locale}/account/listings`}>{ar ? "كل إعلاناتي" : "All my listings"}</Link>
      <h1>{ar ? "إدارة الإعلان." : "Your listing."}</h1>
      <p>
        <code>{listing.reference_code}</code>
      </p>
      <ListingReviewState locale={locale} listing={listing} history={history.data || []} />
      <SellerListingControls
        key={`controls-${listing.updated_at}`}
        locale={locale}
        listing={listing}
      />
      {listing.deleted_at && !listing.seller_deleted && (
        <p className="notice error">
          {ar
            ? "حُذف الإعلان بواسطة الإدارة. تواصل مع الإدارة لطلب استعادته."
            : "This listing was deleted by an admin. Contact the team to request restoration."}
        </p>
      )}
      {listing.hidden && (
        <p className="notice error">
          {ar ? "الإعلان مخفي بواسطة الإدارة." : "This listing has been hidden by an admin."}
        </p>
      )}
      {listing.status === "listed" &&
        listing.review_status === "approved" &&
        !listing.hidden &&
        !listing.deleted_at && (
          <p>
            <Link href={`/${locale}/listings/${id}`}>
              {ar ? "عرض صفحة الإعلان" : "View listing page"} ↗
            </Link>
          </p>
        )}
      {!listing.deleted_at && (
        <ListingForm
          key={`editor-${listing.updated_at}`}
          locale={locale}
          listing={listing}
          governorate={listing.governorate}
        />
      )}
      <section className="evidence-section">
        <h2>{ar ? "الفحص الميداني — مجاني حاليًا" : "Physical inspection — free initially"}</h2>
        {(requests.data as InspectionRequest[]).map((r) => (
          <InspectionRequestCard key={`${r.id}-${r.status}`} locale={locale} request={r} />
        ))}
        {!active && !listing.deleted_at && listing.status === "listed" && !listing.hidden && (
          <InspectionRequestForm locale={locale} lid={id} revision={listing.revision} />
        )}
      </section>
      <section className="evidence-section">
        <div className="eyebrow">{ar ? "الأدلة والاختبارات" : "EVIDENCE & BENCHMARKS"}</div>
        <BenchmarkHistory locale={locale} items={b} revision={listing.revision} />
        {!listing.deleted_at &&
        ["listed", "draft", "pending_review", "paused"].includes(listing.status) ? (
          <EvidenceForm locale={locale} lid={id} revision={listing.revision} />
        ) : (
          <p>
            {ar
              ? "إرسال الاختبارات متاح للإعلانات غير المحذوفة التي ليست مباعة أو مؤرشفة."
              : "Benchmark submission is available for nondeleted listings that are not sold or archived."}
          </p>
        )}
      </section>
    </div>
  );
}
