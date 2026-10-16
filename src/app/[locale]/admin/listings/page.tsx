import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { getListingReviewQueue, listingReviewStatuses } from "@/lib/listing-reviews";
import { listingReviewLabel } from "@/lib/listing-status";
import type { QueueSearch } from "@/lib/admin-review-queues";
import { ListingReviewForm, ListingReviewState } from "@/components/listing-review";
import { ReviewQueuePagination } from "@/components/admin-review-queue";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
export default async function ListingReviews({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueueSearch>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireStaff(locale);
  const queue = await getListingReviewQueue(await searchParams),
    ar = locale === "ar";
  return (
    <div className="review-queue">
      <header className="admin-heading">
        <div>
          <div className="eyebrow">{ar ? "قرارات النشر" : "PUBLICATION DECISIONS"}</div>
          <h1>{ar ? "مراجعة الإعلانات." : "Listing reviews."}</h1>
          <p>
            {ar
              ? "تبقى الإعلانات خاصة حتى الموافقة. مراجعة النشر مستقلة عن الاختبارات والفحص الميداني."
              : "Listings remain private until approved. Publication review is independent of benchmarks and physical inspections."}
          </p>
        </div>
      </header>
      <form className="review-queue-search">
        <div className="field">
          <label htmlFor="listing-search">
            {ar ? "معرف المنتج أو العنوان" : "Product ID or title"}
          </label>
          <Input
            id="listing-search"
            name="q"
            defaultValue={queue.term}
            maxLength={150}
            placeholder="PCX-100001 / UUID"
          />
        </div>
        <div className="field">
          <label htmlFor="listing-filter">{ar ? "حالة المراجعة" : "Review status"}</label>
          <Select id="listing-filter" name="status" defaultValue={queue.status}>
            {listingReviewStatuses.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? ar
                    ? "كل الإعلانات"
                    : "All listings"
                  : listingReviewLabel(s, locale)}
              </option>
            ))}
          </Select>
        </div>
        <Button>{ar ? "بحث" : "Search"}</Button>
        <Link href={`/${locale}/admin/listings`}>{ar ? "مسح البحث" : "Clear search"}</Link>
      </form>
      <p>
        {queue.total} {ar ? "إعلان مطابق" : "matching listings"}
      </p>
      {!queue.items.length && (
        <p className="notice">
          {ar ? "لا توجد إعلانات مطابقة للمراجعة." : "No matching listings for review."}
        </p>
      )}
      {queue.items.map(({ listing: l, seller }) => (
        <article className="review-card" key={`${l.id}-${l.updated_at}`}>
          <h2>{l.title}</h2>
          <Link href={`/${locale}/admin/products/seller/${l.id}`}>
            <code>{l.reference_code}</code> ·{" "}
            {ar ? "تفاصيل المنتج والصور" : "Product details and photos"} ↗
          </Link>
          <p>
            {seller.display_name} · {seller.governorate}
          </p>
          <p>
            {formatMoney(l.price_piastres, locale)} · {l.brand} · {l.model}
          </p>
          <ListingReviewState locale={locale} listing={l} />
          <div className="market-actions">
            <Link
              href={`/${locale}/admin/benchmarks?${new URLSearchParams({ q: l.reference_code, status: "all" })}`}
            >
              {ar ? "مراجعة الاختبارات المنفصلة" : "Separate benchmark reviews"}
            </Link>
          </div>
          {l.review_status === "pending" && !l.deleted_at ? (
            <ListingReviewForm locale={locale} listing={l} />
          ) : l.review_status === "pending" ? (
            <p className="notice">
              {ar ? "استعد الإعلان المحذوف أولًا." : "Restore the deleted listing first."}
            </p>
          ) : null}
        </article>
      ))}
      <ReviewQueuePagination locale={locale} {...queue} />
    </div>
  );
}
