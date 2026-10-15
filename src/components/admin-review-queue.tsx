import Link from "next/link";
import type { Locale } from "@/lib/domain";
import { queueStatuses, type QueueKind, type QueueItem } from "@/lib/admin-review-queues";
import { Input, Select } from "./ui/input";
import { Button } from "./ui/button";
const labels: Record<string, [string, string]> = {
  pending: ["Pending", "في الانتظار"],
  all: ["All applications", "كل الطلبات"],
  approved: ["Approved", "تمت الموافقة"],
  changes_requested: ["Changes requested", "تعديلات مطلوبة"],
  rejected: ["Rejected", "مرفوض"],
  revoked: ["Watermark revoked", "تم سحب العلامة"],
  active: ["Active requests", "الطلبات النشطة"],
  requested: ["Requested", "تم الطلب"],
  scheduled: ["Scheduled", "تم تحديد موعد"],
  completed: ["Completed", "مكتمل"],
  declined: ["Declined", "تعذر قبول الطلب"],
  cancelled: ["Cancelled", "ملغي"],
};
export const queueStatusLabel = (status: string, locale: Locale) =>
  labels[status]?.[locale === "ar" ? 1 : 0] || status;
export function ReviewQueueFilters({
  locale,
  kind,
  term,
  status,
}: {
  locale: Locale;
  kind: QueueKind;
  term: string;
  status: string;
}) {
  const ar = locale === "ar";
  return (
    <form className="review-queue-search">
      <div className="field">
        <label htmlFor="review-product-id">{ar ? "معرف المنتج" : "Product ID"}</label>
        <Input
          id="review-product-id"
          name="q"
          defaultValue={term}
          placeholder="PCX-100001 / UUID"
          maxLength={150}
        />
      </div>
      <div className="field">
        <label htmlFor="review-status">{ar ? "حالة الطلب" : "Application status"}</label>
        <Select id="review-status" name="status" defaultValue={status}>
          {queueStatuses[kind].map((s) => (
            <option key={s} value={s}>
              {queueStatusLabel(s, locale)}
            </option>
          ))}
        </Select>
      </div>
      <Button>{ar ? "بحث" : "Search"}</Button>
      <Link href={`/${locale}/admin/${kind === "benchmark" ? "benchmarks" : "inspections"}`}>
        {ar ? "مسح البحث" : "Clear search"}
      </Link>
    </form>
  );
}
export function ReviewApplicant({ locale, item }: { locale: Locale; item: QueueItem<unknown> }) {
  const ar = locale === "ar",
    p = item.product;
  return (
    <>
      <div className="review-product-reference">
        <Link href={`/${locale}/admin/products/seller/${p.id}`}>
          <code>{p.reference_code}</code> · {ar ? "إدارة المنتج" : "Manage product"} ↗
        </Link>
      </div>
      <h2>{p.title}</h2>
      <p>
        {ar ? "مقدم الطلب: " : "Applicant: "}
        <strong>{item.applicant.display_name || (ar ? "بائع" : "Seller")}</strong> ·{" "}
        {item.applicant.governorate}
      </p>
      {(p.deleted_at || p.hidden || p.status !== "listed") && (
        <p className="notice">
          {ar
            ? "المنتج غير متاح حاليًا؛ راجع حالته من صفحة إدارته."
            : "The product is currently unavailable. Check its state in product management."}
        </p>
      )}
    </>
  );
}
export function ReviewQueuePagination({
  locale,
  term,
  status,
  page,
  total,
}: {
  locale: Locale;
  term: string;
  status: string;
  page: number;
  total: number;
}) {
  const href = (n: number) => `?${new URLSearchParams({ q: term, status, page: String(n) })}`;
  return (
    <nav
      className="pagination"
      aria-label={locale === "ar" ? "صفحات الطلبات" : "Application pages"}
    >
      {page > 1 && <Link href={href(page - 1)}>{locale === "ar" ? "السابق" : "Previous"}</Link>}
      <span>
        {locale === "ar" ? "صفحة" : "Page"} {page}
      </span>
      {page * 20 < total && (
        <Link href={href(page + 1)}>{locale === "ar" ? "التالي" : "Next"}</Link>
      )}
    </nav>
  );
}
