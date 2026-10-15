import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getContactProfile } from "@/lib/marketplace";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SellerListingControls } from "@/components/seller-listing-controls";
import { DeletedFileCleanup } from "@/components/permanent-delete-form";
import { sellerStatusLabel } from "@/lib/listing-status";
export const metadata = { title: "My listings", robots: { index: false, follow: false } };
export default async function Listings({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; view?: string; notice?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const a = await requireUser(locale, `/${locale}/account/listings`);
  const client = await createSupabaseClient();
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page) || 1)));
  const deleted = q.view === "deleted";
  const query = client!
    .from("marketplace_listings")
    .select("*", { count: "exact" })
    .eq("seller_id", a.user!.id);
  const [profile, result, cleanup] = await Promise.all([
    getContactProfile(a.user!.id),
    (deleted ? query.not("deleted_at", "is", null) : query.is("deleted_at", null))
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20 - 1),
    client!.rpc("seller_pending_file_cleanup"),
  ]);
  if (result.error) throw new Error("Listings could not be loaded.");
  if (cleanup.error) throw new Error("File cleanup status could not be loaded.");
  return (
    <div className="container content-section">
      <div className="account-top">
        <div>
          <div className="eyebrow">{ar ? "مساحة البائع" : "SELLER WORKSPACE"}</div>
          <h1>{ar ? "إعلاناتي." : "My listings."}</h1>
        </div>
        <Button asChild>
          <Link href={`/${locale}/account/listings/new`}>{ar ? "أضف إعلان" : "New listing"}</Link>
        </Button>
      </div>
      {!profile && (
        <p className="notice">
          <Link href={`/${locale}/account/setup`}>
            {ar
              ? "أكمل بيانات التواصل قبل نشر أول إعلان."
              : "Complete contact setup before publishing your first listing."}
          </Link>
        </p>
      )}
      <p>
        <Link href={`/${locale}/account/setup`}>
          {ar ? "تعديل بيانات التواصل" : "Edit contact details"}
        </Link>
      </p>
      {q.notice === "deleted" && (
        <p className="notice" role="status">
          {ar
            ? "تم نقل الإعلان إلى المحذوفات. يمكنك استعادته كمسودة."
            : "Listing moved to Deleted. You can restore it as a draft."}
        </p>
      )}
      {q.notice === "permanently_deleted" && (
        <p className="notice" role="status">
          {ar ? "تم حذف الإعلان نهائيًا." : "Listing permanently deleted."}
        </p>
      )}
      {!!cleanup.data.length && <DeletedFileCleanup locale={locale} audience="owner" />}
      <nav className="seller-list-tabs" aria-label={ar ? "قوائم الإعلانات" : "Listing views"}>
        <Link href={`/${locale}/account/listings`} aria-current={!deleted ? "page" : undefined}>
          {ar ? "إعلاناتي" : "My listings"}
        </Link>
        <Link
          href={`/${locale}/account/listings?view=deleted`}
          aria-current={deleted ? "page" : undefined}
        >
          {ar ? "المحذوفات" : "Deleted"}
        </Link>
      </nav>
      {result.data.length ? (
        <div className="market-list">
          {result.data.map((l) => (
            <article className="market-row" key={l.id}>
              <div>
                <span className="badge">
                  {l.deleted_at ? (ar ? "محذوف" : "Deleted") : sellerStatusLabel(l.status, locale)}
                  {l.hidden ? (ar ? " · مخفي بواسطة الإدارة" : " · Hidden by admin") : ""}
                </span>
                <h2>
                  <Link href={`/${locale}/account/listings/${l.id}`}>{l.title}</Link>
                </h2>
                <p className="product-reference">{l.reference_code}</p>
                <p>{formatMoney(l.price_piastres, locale)}</p>
              </div>
              <div className="seller-row-actions">
                <SellerListingControls key={l.updated_at} locale={locale} listing={l} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/${locale}/account/listings/${l.id}`}>
                    {ar ? "إدارة الإعلان والأدلة" : "Manage listing & evidence"}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            deleted
              ? ar
                ? "لا توجد إعلانات محذوفة."
                : "No deleted listings."
              : ar
                ? "إعلانك الأول يبدأ هنا."
                : "Your first listing starts here."
          }
          description={
            deleted
              ? ar
                ? "ستظهر هنا الإعلانات التي تحذفها."
                : "Listings you delete will appear here."
              : ar
                ? "اعرض المكونات أو جهازك الكامل، وتواصل مع المشترين مباشرة."
                : "List a component or a complete PC and connect directly with buyers."
          }
        />
      )}
      <nav className="pagination" aria-label="Pagination">
        {page > 1 && (
          <Link href={`?page=${page - 1}${deleted ? "&view=deleted" : ""}`}>
            {ar ? "السابق" : "Previous"}
          </Link>
        )}
        {page * 20 < (result.count || 0) && (
          <Link href={`?page=${page + 1}${deleted ? "&view=deleted" : ""}`}>
            {ar ? "التالي" : "Next"}
          </Link>
        )}
      </nav>
    </div>
  );
}
