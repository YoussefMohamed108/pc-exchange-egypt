import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { createSupabaseClient } from "@/lib/supabase/server";
import { marketplaceImage } from "@/lib/marketplace";
import { checkLabel, type FieldReport } from "@/lib/inspections";
export const metadata = { title: "PCX physical inspection report" };
export default async function InspectionReport({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const client = await createSupabaseClient();
  if (!client) notFound();
  const { data, error } = await client
    .from("public_field_inspections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Inspection report could not be loaded.");
  if (!data) notFound();
  const r = data as FieldReport,
    ar = locale === "ar";
  const valid =
    r.outcome === "passed" && r.current_revision && r.latest_report && !r.revoked_at && r.unexpired;
  const status = r.revoked_at
    ? ar
      ? "تم سحب العلامة"
      : "Watermark revoked"
    : !r.current_revision || !r.latest_report || !r.unexpired
      ? ar
        ? "التقرير لم يعد ساريًا"
        : "Report no longer current"
      : r.outcome === "failed"
        ? ar
          ? "لم ينجح الفحص"
          : "Inspection failed"
        : r.outcome === "incomplete"
          ? ar
            ? "الفحص غير مكتمل"
            : "Inspection incomplete"
          : "PCX Inspected";
  return (
    <main className="container content-section market-page">
      <Link href={`/${locale}/listings/${r.listing_id}`}>← {r.product_title}</Link>
      <header className="panel">
        <div className="eyebrow">{r.reference_code} / INSPECTION REPORT</div>
        <h1>{ar ? "تقرير الفحص الميداني." : "Physical inspection report."}</h1>
        <span className={valid ? "badge inspection-approved" : "badge"}>
          <ShieldCheck size={16} /> {status}
        </span>
        <p>{r.product_title}</p>
        <p>
          {ar ? "تاريخ الفحص: " : "Inspected: "}
          {r.inspected_on} · {ar ? "تنتهي الصلاحية: " : "Valid until: "}
          {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", { timeZone: "Africa/Cairo" }).format(
            new Date(r.expires_at),
          )}
        </p>
        <p>
          {ar
            ? "يسجل التقرير حالة الجهاز وقت الفحص وحدود الاختبارات الموضحة. لا يمنح ضمانًا."
            : "This report records the device’s condition at inspection and the tests performed. It does not include a warranty."}
        </p>
        {r.revoked_reason && <p className="notice error">{r.revoked_reason}</p>}
      </header>
      <section className="panel">
        <h2>{ar ? "هوية الجهاز" : "Device identity"}</h2>
        <p>{r.identity_description}</p>
        <p className="field-hint">
          {ar
            ? "الرقم التسلسلي الكامل محفوظ بشكل خاص لدى الإدارة."
            : "The full device identifier is held privately by the inspection team."}
        </p>
        <h2>{ar ? "النتائج" : "Findings"}</h2>
        <p className="preserve-lines">{r.findings}</p>
        <h3>{ar ? "العيوب الملحوظة" : "Observed defects"}</h3>
        <p className="preserve-lines">{r.known_defects}</p>
      </section>
      <section className="panel">
        <h2>{ar ? "الاختبارات المسجلة" : "Recorded checks"}</h2>
        {Object.entries(r.checks).map(([k, v]) => (
          <article className="audit-entry" key={k}>
            <h3>{checkLabel(k, locale)}</h3>
            <span className="badge">
              {ar
                ? { pass: "ناجح", fail: "فشل", not_tested: "لم يُختبر" }[v.result]
                : { pass: "Pass", fail: "Fail", not_tested: "Not tested" }[v.result]}
            </span>
            <p className="preserve-lines">{v.notes}</p>
          </article>
        ))}
      </section>
      <section>
        <h2>{ar ? "صور الزيارة" : "Visit photos"}</h2>
        <div className="inspection-evidence-gallery">
          {r.photo_paths.map((p, i) => {
            const src = marketplaceImage(p);
            return src ? (
              <Image
                key={p}
                src={src}
                alt={`${ar ? "صورة الفحص" : "Inspection photo"} ${i + 1}`}
                width={850}
                height={650}
                unoptimized
              />
            ) : null;
          })}
        </div>
        <p className="field-hint">
          {ar ? "معرف التقرير: " : "Report ID: "}
          {r.id}
        </p>
      </section>
    </main>
  );
}
