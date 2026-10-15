import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { getAdminReviewQueue, type QueueSearch } from "@/lib/admin-review-queues";
import {
  ReviewQueueFilters,
  ReviewApplicant,
  ReviewQueuePagination,
} from "@/components/admin-review-queue";
import { InspectionRequestCard, FieldInspectionForm } from "@/components/product-operations-forms";
export default async function Inspections({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueueSearch>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await requireStaff(locale, "inspection");
  const search = await searchParams;
  if (typeof search.product === "string" && /^[a-f0-9-]{36}$/i.test(search.product))
    redirect(`/${locale}/admin/products/company/${search.product}#physical-inspections`);
  const queue = await getAdminReviewQueue("physical", search),
    ar = locale === "ar";
  return (
    <div className="review-queue">
      <header className="admin-heading">
        <div>
          <div className="eyebrow">{ar ? "الفحص الميداني" : "PHYSICAL INSPECTION REQUESTS"}</div>
          <h1>{ar ? "الفحوصات." : "Inspections."}</h1>
          <p>
            {ar
              ? "المستخدمون الذين طلبوا زيارة لفحص أجهزتهم. ابحث بمعرف المنتج لتحديد الموعد أو تسجيل نتائج الفحص. الخدمة مجانية خلال الإطلاق."
              : "Users who requested an in-person device inspection. Search by product ID to arrange a visit or record its results. Free during launch."}
          </p>
        </div>
      </header>
      <ReviewQueueFilters locale={locale} kind="physical" term={queue.term} status={queue.status} />
      <p>
        {queue.total} {ar ? "طلب مطابق" : "matching inspection requests"}
      </p>
      {!queue.items.length && (
        <p className="notice">
          {ar
            ? "لا توجد طلبات فحص ميداني مطابقة. جرّب معرف المنتج أو اختَر كل الطلبات."
            : "No matching physical-inspection requests. Try the product ID or select All applications."}
        </p>
      )}
      {queue.items.map((item) => {
        const r = item.application,
          p = item.product;
        const canInspect =
          r.status === "scheduled" &&
          !p.deleted_at &&
          !p.hidden &&
          p.status === "listed" &&
          p.revision === r.revision &&
          p.seller_id !== account.user!.id;
        return (
          <article className="review-card physical-review-card" key={r.id}>
            <ReviewApplicant locale={locale} item={item} />
            <p className="field-hint">
              {ar ? "تاريخ الطلب: " : "Requested: "}
              {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", {
                dateStyle: "medium",
                timeZone: "Africa/Cairo",
              }).format(new Date(r.created_at))}
            </p>
            <details className="applicant-contact">
              <summary>
                {ar ? "بيانات التواصل لترتيب الزيارة" : "Contact details for the visit"}
              </summary>
              {item.applicant.phone && <p dir="ltr">{item.applicant.phone}</p>}
              {item.applicant.social_url && (
                <p>
                  <a href={item.applicant.social_url} target="_blank" rel="noopener noreferrer">
                    {ar ? "رابط التواصل" : "Contact link"} ↗
                  </a>
                </p>
              )}
            </details>
            <InspectionRequestCard
              key={`${r.id}-${r.status}-${r.scheduled_at}`}
              locale={locale}
              request={r}
              admin
            />
            {canInspect && (
              <details className="inspection-report-entry">
                <summary>
                  {ar ? "تسجيل نتائج الفحص الميداني" : "Record physical inspection results"}
                </summary>
                <FieldInspectionForm locale={locale} requestId={r.id} category={p.category_slug} />
              </details>
            )}
            {r.status === "scheduled" && !canInspect && (
              <p>
                {ar
                  ? "لا يمكن نشر التقرير: تحقق من حالة المنتج ونسخته، ولا يمكنك فحص إعلانك الخاص."
                  : "A report cannot be published: check the product state and revision. Admins cannot inspect their own listing."}
              </p>
            )}
            {item.report_id && (
              <p>
                <Link href={`/${locale}/inspections/${item.report_id}`}>
                  {ar ? "عرض تقرير الفحص" : "View inspection report"} ↗
                </Link>
              </p>
            )}
          </article>
        );
      })}
      <ReviewQueuePagination locale={locale} {...queue} />
    </div>
  );
}
