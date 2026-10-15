import Link from "next/link";
import type { Locale } from "@/lib/domain";
import type { Benchmark } from "@/lib/marketplace-validation";
export function BenchmarkHistory({
  items,
  revision,
  locale,
}: {
  items: Benchmark[];
  revision: number;
  locale: Locale;
}) {
  const ar = locale === "ar";
  const labels = {
    pending: ar ? "في انتظار مراجعة الأدمن" : "Awaiting admin review",
    approved: ar ? "وافق الأدمن على الأدلة" : "Evidence approved",
    changes_requested: ar ? "تعديلات مطلوبة" : "Changes requested",
    rejected: ar ? "لم تتم الموافقة" : "Not approved",
  };
  return (
    <div className="benchmark-history">
      {items.map((b) => (
        <article className="evidence-card" key={b.id}>
          <span className="badge">
            {b.revoked_at ? (ar ? "تم سحب العلامة" : "Watermark revoked") : labels[b.status]}
          </span>
          {b.revoked_reason && <p>{b.revoked_reason}</p>}
          {b.revision !== revision && (
            <span className="badge">{ar ? "مكونات سابقة" : "Previous hardware revision"}</span>
          )}
          <p>
            {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG").format(new Date(b.submitted_at))} ·{" "}
            {b.page_count} {ar ? "صفحة" : "pages"}
          </p>
          <Link href={`/${locale}/evidence/${b.id}`} target="_blank" rel="noopener">
            {ar ? "عرض ملف الاختبارات PDF" : "View benchmark PDF"} ↗
          </Link>
          {b.review_note && (
            <p>
              <strong>{ar ? "تعليق الأدمن: " : "Admin comment: "}</strong>
              {b.review_note}
            </p>
          )}
          {b.expires_at && (
            <p>
              {ar ? "تنتهي صلاحية المراجعة في " : "Review valid until "}
              {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG").format(new Date(b.expires_at))}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
