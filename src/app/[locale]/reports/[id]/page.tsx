import { notFound } from "next/navigation";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { getReport } from "@/lib/catalog";
export const metadata = { title: "Hardware inspection report" };
export default async function Report({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(id).success) notFound();
  const r = await getReport(id);
  if (!r) notFound();
  const t = dictionary(locale),
    expired = !r.current_revision || new Date(r.expires_at) < new Date(),
    date = (value: string) =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", { dateStyle: "medium" }).format(
        new Date(value),
      );
  return (
    <div className="container content-section">
      <div className="report-header">
        <div>
          <div className="eyebrow">PCX / {id.slice(0, 8).toUpperCase()}</div>
          <h1 style={{ marginTop: 12 }}>{t.inspection}</h1>
        </div>
        <span className={`badge ${!expired && r.outcome === "passed" ? "success" : ""}`}>
          <ShieldCheck size={15} />
          {r.revoked_at
            ? locale === "ar"
              ? "تم سحب العلامة"
              : "Watermark revoked"
            : expired
              ? t.expired
              : r.outcome === "passed"
                ? t.verified
                : t.failed}
        </span>
      </div>
      <div className="report-meta">
        <span>
          {t.product}
          <strong>
            {r.product_brand} {r.product_model}
          </strong>
        </span>
        <span>
          {locale === "ar" ? "المفتش" : "Inspector"}
          <strong>{r.inspector_reference}</strong>
        </span>
        <span>
          {t.reportDate}
          <strong>{date(r.inspected_at)}</strong>
        </span>
        <span>
          {t.validUntil}
          <strong>{date(r.expires_at)}</strong>
        </span>
        <span>
          {t.condition}
          <strong>
            {t.grade} {r.condition} — {t[`grade${r.condition}`]}
          </strong>
        </span>
      </div>
      <div className="notice">{t.reportScopeNote}</div>
      {r.revoked_reason && <p className="notice error">{r.revoked_reason}</p>}
      <div className="detail-panels">
        <section className="panel">
          <h2>{t.findings}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.findings}</p>
          <h2 style={{ marginTop: 25 }}>{t.testResults.replace(" (JSON)", "")}</h2>
          <dl className="spec-list">
            {Object.entries(r.tests).map(([key, value]) => (
              <div style={{ display: "contents" }} key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="panel-stack">
          <section className="panel">
            <h2>{t.inspectionScope}</h2>
            <p>{r.scope}</p>
          </section>
          <section className="panel">
            <h2>{t.defects}</h2>
            <p>{r.known_defects || "—"}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
