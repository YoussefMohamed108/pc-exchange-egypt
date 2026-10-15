"use client";
import { useActionState, useState } from "react";
import type { Locale } from "@/lib/domain";
import type { MarketplaceState } from "@/lib/action-state";
import { ActionResult } from "./ui/action-result";
import { localizedText as text } from "@/lib/i18n";
import { Button } from "./ui/button";
import { submitBenchmark, reviewBenchmark } from "@/app/actions/marketplace";
import { Input, Select, Textarea } from "./ui/input";
export function EvidenceForm({
  locale,
  lid,
  revision,
}: {
  locale: Locale;
  lid: string;
  revision: number;
}) {
  const [state, action, pending] = useActionState(
    submitBenchmark.bind(null, locale, lid),
    {} as MarketplaceState,
  );
  return (
    <form action={action} className="market-form evidence-form">
      <h2>{text(locale, "Submit benchmarks", "إرسال الاختبارات")}</h2>
      <ActionResult state={state} locale={locale} />
      <p>
        {text(
          locale,
          "Include benchmark screenshots, hardware identification, test settings and date. Show this listing code with the results:",
          "ضمّن صور الاختبارات وبيانات المكونات وإعدادات الاختبار والتاريخ. أظهر كود الإعلان مع النتائج:",
        )}{" "}
        <strong>{lid.slice(0, 8).toUpperCase()}</strong>
      </p>
      <p>
        {text(
          locale,
          "Upload one unlocked PDF, up to 12 pages and 3 MB. Pages are converted to images in a fresh PDF for sharing.",
          "ارفع PDF غير محمي، حتى 12 صفحة و3 ميجابايت. الصفحات تُحوّل لصور في ملف PDF جديد للمشاركة.",
        )}
      </p>
      <input type="hidden" name="revision" value={revision} />
      <Input
        name="evidence"
        type="file"
        accept="application/pdf"
        required
        aria-label={text(locale, "Benchmark PDF", "ملف الاختبارات PDF")}
      />
      <label className="check-field">
        <input type="checkbox" name="share" value="yes" required />
        {text(
          locale,
          "I understand that signed-in users can view this PDF, including before admin review. It contains no private contact information or unrelated personal data.",
          "أفهم أن المستخدمين المسجلين يقدروا يشوفوا الملف حتى قبل المراجعة، وأنه لا يحتوي على بيانات تواصل خاصة أو معلومات شخصية غير مطلوبة.",
        )}
      </label>
      <Button disabled={pending}>
        {text(
          locale,
          pending ? "Preparing evidence…" : "Submit for review",
          pending ? "جاري تجهيز الملف…" : "إرسال للمراجعة",
        )}
      </Button>
    </form>
  );
}
export function BenchmarkReviewForm({ locale, sid }: { locale: Locale; sid: string }) {
  const [decision, setDecision] = useState("");
  const [state, action, pending] = useActionState(
    reviewBenchmark.bind(null, locale, sid),
    {} as MarketplaceState,
  );
  return (
    <form action={action} className="market-form">
      <ActionResult state={state} locale={locale} />
      <div className="field">
        <label htmlFor={`decision-${sid}`}>{text(locale, "Decision", "القرار")}</label>
        <Select
          id={`decision-${sid}`}
          name="decision"
          required
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          <option value="" disabled>
            {text(locale, "Choose a decision", "اختر القرار")}
          </option>
          <option value="approved">
            {text(
              locale,
              "Approve — award Benchmark reviewed",
              "موافقة — منح علامة تمت مراجعة الاختبارات",
            )}
          </option>
          <option value="rejected">
            {text(locale, "Refuse — no watermark", "رفض — بدون علامة")}
          </option>
        </Select>
      </div>
      <div className="field">
        <label htmlFor={`note-${sid}`}>
          {text(
            locale,
            decision === "rejected"
              ? "Reason for refusal (required — shown to the seller)"
              : "Comment to seller (optional)",
            decision === "rejected" ? "سبب الرفض (مطلوب — يظهر للبائع)" : "تعليق للبائع (اختياري)",
          )}
        </label>
        <Textarea
          id={`note-${sid}`}
          name="note"
          required={decision === "rejected"}
          minLength={5}
          maxLength={2000}
        />
        <p className="field-hint">
          {text(
            locale,
            "The seller can read your decision and comment in their listing’s benchmark history. Signed-in viewers of the evidence can also see the comment.",
            "البائع يقدر يشوف القرار والتعليق في سجل اختبارات إعلانه. التعليق ظاهر أيضًا للمستخدمين المسجلين الذين يمكنهم مشاهدة الأدلة.",
          )}
        </p>
      </div>
      <p>
        {text(
          locale,
          "Approval applies to this hardware revision for 90 days. It does not certify a physical inspection.",
          "الموافقة تخص المكونات الحالية لمدة 90 يومًا، ولا تعني إجراء فحص فعلي.",
        )}
      </p>
      <Button disabled={pending}>
        {text(
          locale,
          pending ? "Submitting…" : "Submit review",
          pending ? "جاري الإرسال…" : "إرسال المراجعة",
        )}
      </Button>
    </form>
  );
}
