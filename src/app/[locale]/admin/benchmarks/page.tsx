import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { specificationLabel } from "@/lib/hardware-specifications";
import { getAdminReviewQueue, type QueueSearch } from "@/lib/admin-review-queues";
import {
  ReviewQueueFilters,
  ReviewApplicant,
  ReviewQueuePagination,
  queueStatusLabel,
} from "@/components/admin-review-queue";
import { BenchmarkReviewForm } from "@/components/benchmark-forms";
export default async function Benchmarks({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueueSearch>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await requireStaff(locale);
  const queue = await getAdminReviewQueue("benchmark", await searchParams),
    ar = locale === "ar";
  return (
    <div className="review-queue">
      <header className="admin-heading">
        <div>
          <div className="eyebrow">{ar ? "مراجعة أدلة PDF" : "BENCHMARK PDF APPLICATIONS"}</div>
          <h1>{ar ? "مراجعة الاختبارات." : "Benchmark reviews."}</h1>
          <p>
            {ar
              ? "طلبات البائعين الذين أرسلوا ملف اختبارات PDF. ابحث بمعرف المنتج لعرض الأدلة واتخاذ قرار المراجعة."
              : "Sellers who submitted a benchmark PDF for review. Search by product ID to open their evidence and record your decision."}
          </p>
        </div>
      </header>
      <ReviewQueueFilters
        locale={locale}
        kind="benchmark"
        term={queue.term}
        status={queue.status}
      />
      <p>
        {queue.total} {ar ? "طلب مطابق" : "matching benchmark applications"}
      </p>
      {!queue.items.length && (
        <p className="notice">
          {ar
            ? "لا توجد طلبات مراجعة اختبارات مطابقة. جرّب معرف المنتج أو اختَر كل الطلبات."
            : "No matching benchmark applications. Try the product ID or select All applications."}
        </p>
      )}
      {queue.items.map((item) => {
        const b = item.application,
          l = item.product,
          snapshot = b.snapshot;
        const reviewable =
          b.status === "pending" &&
          item.is_latest &&
          l.revision === b.revision &&
          !l.deleted_at &&
          ["listed", "draft", "paused"].includes(l.status) &&
          b.seller_id !== account.user!.id;
        const blockedReason =
          b.seller_id === account.user!.id
            ? ar
              ? "هذا إعلانك الخاص. يجب أن يراجعه أدمن آخر؛ لا يمكنك منح علامة لإعلانك."
              : "This is your own listing. Another admin must review it; you cannot award your own watermark."
            : l.deleted_at
              ? ar
                ? "استعد المنتج المحذوف قبل مراجعة الأدلة."
                : "Restore the deleted product before reviewing its evidence."
              : !item.is_latest || l.revision !== b.revision
                ? ar
                  ? "هذه أدلة سابقة. راجع أحدث ملف للمكونات الحالية."
                  : "This evidence is out of date. Review the latest submission for the current hardware revision."
                : ar
                  ? "المنتج مباع أو مؤرشف. راجع حالته من إدارة المنتج."
                  : "The listing is sold or archived. Check its state in product management.";
        return (
          <article className="review-card benchmark-review-card" key={b.id}>
            <span className="badge">
              {queueStatusLabel(b.revoked_at ? "revoked" : b.status, locale)}
            </span>
            {!item.is_latest && (
              <span className="badge">{ar ? "طلب سابق" : "Superseded submission"}</span>
            )}
            <ReviewApplicant locale={locale} item={item} />
            <p>
              {ar ? "النسخة" : "Revision"} {b.revision} ·{" "}
              {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", {
                dateStyle: "medium",
                timeZone: "Africa/Cairo",
              }).format(new Date(b.submitted_at))}
            </p>
            <details className="submitted-hardware">
              <summary>
                {ar ? "تفاصيل المنتج وقت تقديم الأدلة" : "Hardware details when submitted"}
              </summary>
              <h3>{String(snapshot.title || "")}</h3>
              <p>{String(snapshot.description || "")}</p>
              <p>
                {ar ? "العيوب المعلنة" : "Declared defects"}: {String(snapshot.known_defects || "")}
              </p>
              <dl className="spec-table">
                {Object.entries((snapshot.specifications || {}) as Record<string, unknown>).map(
                  ([k, v]) => (
                    <div key={k}>
                      <dt>{specificationLabel(k, locale)}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ),
                )}
              </dl>
            </details>
            <div className="market-actions">
              <Link href={`/${locale}/evidence/${b.id}`} target="_blank" rel="noopener">
                {ar ? "عرض الأدلة PDF" : "View evidence PDF"} ↗
              </Link>
              {l.status === "listed" && !l.hidden && !l.deleted_at && (
                <Link href={`/${locale}/listings/${l.id}`}>
                  {ar ? "عرض الإعلان" : "View listing"}
                </Link>
              )}
            </div>
            <details className="benchmark-pdf-preview">
              <summary>{ar ? "معاينة الأدلة هنا" : "Preview evidence here"}</summary>
              <iframe
                src={`/${locale}/evidence/${b.id}`}
                title={
                  ar
                    ? `أدلة الاختبارات ${l.reference_code}`
                    : `Benchmark evidence ${l.reference_code}`
                }
                loading="lazy"
              />
              <p className="field-hint">
                {ar
                  ? "لو المعاينة غير مدعومة على جهازك، استخدم رابط عرض الأدلة PDF."
                  : "If your browser cannot preview PDFs, use View evidence PDF above."}
              </p>
            </details>
            {reviewable && (l.hidden || l.status === "draft") && (
              <p className="notice">
                {ar
                  ? "يمكنك مراجعة الأدلة الآن. تظل حالة العرض كما هي، وتظهر العلامة للزبائن بعد نشر المنتج واستئنافه."
                  : "You can review the evidence now. This does not publish or resume the listing; the watermark appears to buyers once it is available."}
              </p>
            )}
            {b.review_note && <p>{b.review_note}</p>}
            {b.revoked_reason && <p>{b.revoked_reason}</p>}
            {reviewable ? (
              <BenchmarkReviewForm locale={locale} sid={b.id} />
            ) : b.status === "pending" ? (
              <p className="notice">{blockedReason}</p>
            ) : null}
          </article>
        );
      })}
      <ReviewQueuePagination locale={locale} {...queue} />
    </div>
  );
}
