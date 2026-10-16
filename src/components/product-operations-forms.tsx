"use client";
import { useActionState, useState } from "react";
import type { CategorySlug, Locale } from "@/lib/domain";
import {
  inspectionChecklist,
  checkLabel,
  requestStatus,
  type InspectionRequest,
} from "@/lib/inspections";
import {
  manageProduct,
  requestInspection,
  manageInspection,
  publishFieldReport,
} from "@/app/actions/product-operations";
import { uploadSellerPhoto } from "@/app/actions/marketplace";
import { ActionResult } from "./ui/action-result";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";

export function ProductControls({
  locale,
  source,
  id,
  updatedAt,
  deleted,
  paused,
  status,
}: {
  locale: Locale;
  source: "seller" | "company";
  id: string;
  updatedAt: string;
  deleted: boolean;
  paused: boolean;
  status: string;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(manageProduct.bind(null, locale, source, id), {});
  const [operation, setOperation] = useState(deleted ? "restore" : paused ? "resume" : "pause");
  return (
    <form action={action} className="market-form panel">
      <h2>{ar ? "إدارة المنتج والعلامات" : "Product & watermark controls"}</h2>
      <p>
        {ar
          ? "الحذف يخفي المنتج ويحتفظ بسجل الطلبات والمراجعات. الاستعادة تعيده كمسودة موقوفة."
          : "Delete removes the product from sale and preserves orders and review history. Restore returns it as a paused draft."}
      </p>
      {!deleted && paused && (
        <div className="product-resume-control">
          <p>
            {status === "draft"
              ? ar
                ? source === "seller"
                  ? "المنتج موقوف ومسودة. الاستئناف يعيد الإعلان المعتمد أو يرسله لمراجعة النشر إذا لم تُعتمد نسخته الحالية."
                  : "المنتج موقوف ومسودة. الاستئناف يعيد نشره إذا اكتملت بياناته وصوره."
                : source === "seller"
                  ? "This product is a paused draft. Resume restores an approved listing or submits its unapproved current content for publication review."
                  : "This product is paused and saved as a draft. Resume republishes it when its required details and photos are complete."
              : ar
                ? "المنتج موقوف بواسطة الإدارة."
                : "This product is paused by an admin."}
          </p>
          <Button variant="secondary" name="quick_operation" value="resume" disabled={pending}>
            {status === "draft"
              ? ar
                ? source === "seller"
                  ? "استئناف أو إرسال للمراجعة"
                  : "استئناف ونشر المنتج"
                : source === "seller"
                  ? "Resume / submit for review"
                  : "Resume & publish listing"
              : ar
                ? "استئناف العرض"
                : "Resume listing"}
          </Button>
        </div>
      )}
      <ActionResult state={state} locale={locale} />
      <input type="hidden" name="expected_updated_at" value={updatedAt} />
      <div className="field">
        <label htmlFor="product-operation">{ar ? "الإجراء" : "Action"}</label>
        <Select
          id="product-operation"
          name="operation"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        >
          {deleted ? (
            <option value="restore">
              {ar ? "استعادة كمسودة موقوفة" : "Restore as paused draft"}
            </option>
          ) : (
            <>
              <option value="pause">{ar ? "إيقاف العرض" : "Pause listing"}</option>
              <option value="resume">
                {status === "draft"
                  ? ar
                    ? source === "seller"
                      ? "استئناف أو إرسال للمراجعة"
                      : "استئناف ونشر المنتج"
                    : source === "seller"
                      ? "Resume / submit for review"
                      : "Resume & publish listing"
                  : ar
                    ? "استئناف العرض"
                    : "Resume listing"}
              </option>
              {source === "seller" && (
                <option value="revoke_benchmark">
                  {ar ? "سحب علامة مراجعة الاختبارات" : "Remove Benchmark reviewed watermark"}
                </option>
              )}
              <option value="revoke_inspection">
                {ar ? "سحب علامة الفحص" : "Remove inspection watermark"}
              </option>
              <option value="delete">
                {ar ? "حذف المنتج (قابل للاستعادة)" : "Delete product (recoverable)"}
              </option>
            </>
          )}
        </Select>
      </div>
      <div className="field">
        <label htmlFor="operation-reason">
          {ar ? "السبب (يُسجل في السجل الإداري)" : "Reason (recorded in admin history)"}
        </label>
        <Textarea id="operation-reason" name="reason" minLength={5} maxLength={500} required />
      </div>
      {operation === "delete" && (
        <label className="check-label">
          <input type="checkbox" name="confirm_delete" value="yes" required />
          {ar ? "أؤكد إزالة المنتج من العرض العام." : "I confirm removal from the public store."}
        </label>
      )}
      <Button disabled={pending}>{ar ? "تطبيق الإجراء" : "Apply action"}</Button>
      <p className="field-hint">
        {ar
          ? "استخدم روابط مراجعة الاختبارات والفحص الميداني الخاصة بهذا المنتج لإدارة الطلبات ومنح العلامات."
          : "Use this product’s Benchmark reviews and Physical inspections links to manage applications and award watermarks."}
      </p>
    </form>
  );
}
export function InspectionRequestForm({
  locale,
  lid,
  revision,
}: {
  locale: Locale;
  lid: string;
  revision: number;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(requestInspection.bind(null, locale, lid), {});
  return (
    <form action={action} className="market-form panel">
      <h3>{ar ? "اطلب فحصًا ميدانيًا مجانيًا" : "Request a free physical inspection"}</h3>
      <p>
        {ar
          ? "الفحص مجاني خلال فترة الإطلاق. يتواصل معك الأدمن لتأكيد إمكانية الفحص والموعد. إرسال الطلب لا يمنح علامة."
          : "Free during the launch period. An admin will contact you to confirm availability and arrange a visit. A request does not award a watermark."}
      </p>
      <ActionResult state={state} locale={locale} />
      <input type="hidden" name="revision" value={revision} />
      <div className="field">
        <label htmlFor="inspection-availability">
          {ar
            ? "المنطقة والأوقات المناسبة (خاصة بك وبالإدارة)"
            : "Area and preferred times (private to you and admins)"}
        </label>
        <Textarea id="inspection-availability" name="note" minLength={5} maxLength={500} required />
      </div>
      <Button disabled={pending}>
        {ar ? "طلب فحص مجاني — ٠ ج.م" : "Request inspection — EGP 0"}
      </Button>
    </form>
  );
}
export function InspectionRequestCard({
  locale,
  request,
  admin = false,
}: {
  locale: Locale;
  request: InspectionRequest;
  admin?: boolean;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(
    manageInspection.bind(null, locale, request.id, admin),
    {},
  );
  const [decision, setDecision] = useState("scheduled"),
    [appointment, setAppointment] = useState("");
  const active = ["requested", "scheduled"].includes(request.status);
  return (
    <article className="panel inspection-request">
      <span className="badge">{requestStatus(request.status, locale)}</span>{" "}
      <span className="badge">{ar ? "مجاني" : "Free · EGP 0"}</span>
      <p className="preserve-lines">{request.availability_note}</p>
      {request.scheduled_at && (
        <p>
          {ar ? "الموعد بتوقيت القاهرة: " : "Appointment · Cairo time: "}
          {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Cairo",
          }).format(new Date(request.scheduled_at))}
        </p>
      )}
      {request.admin_note && <p>{request.admin_note}</p>}
      {active && (
        <form action={action} className="market-form">
          <ActionResult state={state} locale={locale} />
          {admin && (
            <div className="field">
              <label htmlFor={`request-decision-${request.id}`}>
                {ar ? "قرار الطلب" : "Request decision"}
              </label>
              <Select
                id={`request-decision-${request.id}`}
                name="decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="scheduled">{ar ? "تحديد موعد" : "Schedule / reschedule"}</option>
                <option value="declined">{ar ? "تعذر قبول الطلب" : "Decline request"}</option>
                <option value="cancelled">{ar ? "إلغاء" : "Cancel request"}</option>
              </Select>
            </div>
          )}
          {admin && decision === "scheduled" && (
            <div className="field">
              <label htmlFor={`appointment-${request.id}`}>
                {ar ? "الموعد بتوقيت جهازك" : "Appointment in your device’s local time"}
              </label>
              <Input
                id={`appointment-${request.id}`}
                type="datetime-local"
                required
                value={appointment}
                onChange={(e) => setAppointment(e.target.value)}
              />
              <input
                type="hidden"
                name="appointment"
                value={
                  appointment && !Number.isNaN(Date.parse(appointment))
                    ? new Date(appointment).toISOString()
                    : ""
                }
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={`request-note-${request.id}`}>
              {admin
                ? ar
                  ? "ملاحظة للبائع"
                  : "Note to seller"
                : ar
                  ? "سبب الإلغاء"
                  : "Cancellation reason"}
            </label>
            <Textarea
              id={`request-note-${request.id}`}
              name="note"
              minLength={5}
              maxLength={1000}
              required
            />
          </div>
          <Button disabled={pending} variant="outline">
            {admin
              ? ar
                ? "حفظ القرار"
                : "Save request decision"
              : ar
                ? "إلغاء طلب الفحص"
                : "Cancel inspection request"}
          </Button>
        </form>
      )}
    </article>
  );
}
export function FieldInspectionForm({
  locale,
  requestId,
  category,
}: {
  locale: Locale;
  requestId: string;
  category: CategorySlug;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(
    publishFieldReport.bind(null, locale, requestId),
    {},
  );
  const keys = inspectionChecklist(category);
  const [checks, setChecks] = useState<Record<string, { result: string; notes: string }>>(() =>
    Object.fromEntries(keys.map((k) => [k, { result: "not_tested", notes: "" }])),
  );
  const [paths, setPaths] = useState<string[]>([]),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState(false);
  return (
    <form action={action} className="market-form panel">
      <h2>{ar ? "تقرير الفحص الميداني" : "Physical inspection report"}</h2>
      <p>
        {ar
          ? "يجب توثيق زيارة حقيقية لهذا الجهاز. تمر جميع الاختبارات المطلوبة لمنح علامة PCX Inspected. التقرير والصور ظاهرون للمشترين؛ الرقم التسلسلي الكامل خاص بالإدارة."
          : "Record an actual visit to this device. Every required check must pass to award PCX Inspected. The report and photos are public; the full serial number stays private to admins."}
      </p>
      <ActionResult state={state} locale={locale} />
      <div className="field">
        <label htmlFor={`inspected-on-${requestId}`}>
          {ar ? "تاريخ الفحص في القاهرة" : "Inspection date in Cairo"}
        </label>
        <Input id={`inspected-on-${requestId}`} type="date" name="inspected_on" required />
      </div>
      <div className="field">
        <label htmlFor={`device-serial-${requestId}`}>
          {ar ? "الرقم التسلسلي / معرف الجهاز (خاص)" : "Serial / device identifier (private)"}
        </label>
        <Input
          id={`device-serial-${requestId}`}
          name="serial_number"
          minLength={4}
          maxLength={200}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`device-identity-${requestId}`}>
          {ar
            ? "وصف يميز الجهاز (عام؛ اخفِ الرقم التسلسلي)"
            : "Identifying description (public; mask the serial)"}
        </label>
        <Textarea
          id={`device-identity-${requestId}`}
          name="identity_description"
          minLength={5}
          maxLength={500}
          required
        />
      </div>
      <fieldset className="inspection-checklist">
        <legend>{ar ? "قائمة الاختبارات المطلوبة" : "Required inspection checks"}</legend>
        {keys.map((k) => (
          <div className="inspection-check" key={k}>
            <label htmlFor={`check-${requestId}-${k}`}>{checkLabel(k, locale)}</label>
            <Select
              id={`check-${requestId}-${k}`}
              value={checks[k].result}
              onChange={(e) =>
                setChecks({ ...checks, [k]: { ...checks[k], result: e.target.value } })
              }
            >
              <option value="not_tested">{ar ? "لم يُختبر" : "Not tested"}</option>
              <option value="pass">{ar ? "ناجح" : "Pass"}</option>
              <option value="fail">{ar ? "فشل" : "Fail"}</option>
            </Select>
            <label className="field-hint" htmlFor={`observation-${requestId}-${k}`}>
              {ar
                ? "الأداة والإعدادات والنتيجة / الملاحظات"
                : "Tool, settings and measured result / observations"}
            </label>
            <Textarea
              id={`observation-${requestId}-${k}`}
              minLength={3}
              maxLength={500}
              required
              value={checks[k].notes}
              onChange={(e) =>
                setChecks({ ...checks, [k]: { ...checks[k], notes: e.target.value } })
              }
            />
          </div>
        ))}
      </fieldset>
      <input type="hidden" name="checks" value={JSON.stringify(checks)} />
      <div className="field">
        <label htmlFor={`inspection-findings-${requestId}`}>
          {ar ? "ملخص نتائج الفحص" : "Inspection findings"}
        </label>
        <Textarea
          id={`inspection-findings-${requestId}`}
          name="findings"
          minLength={10}
          maxLength={3000}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`inspection-defects-${requestId}`}>
          {ar ? "العيوب التي لوحظت" : "Observed defects"}
        </label>
        <Textarea
          id={`inspection-defects-${requestId}`}
          name="known_defects"
          minLength={2}
          maxLength={2000}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`inspection-photos-${requestId}`}>
          {ar
            ? "صور من الزيارة (١–٨، بحد أقصى ٣ ميجابايت للصورة)"
            : "Visit photos (1–8, up to 3 MB each)"}
        </label>
        <Input
          id={`inspection-photos-${requestId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading || paths.length >= 8}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setUploadError(false);
            try {
              const form = new FormData();
              form.set("photo", file);
              const result = await uploadSellerPhoto(locale, form);
              if (result.path) setPaths((v) => [...v, result.path!]);
              else setUploadError(true);
            } catch {
              setUploadError(true);
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }}
        />
        <p className="field-hint">
          {ar
            ? "اخفِ وجوه الأشخاص والعناوين والأرقام التسلسلية الكاملة قبل رفع الصور."
            : "Mask faces, addresses and full serial numbers before uploading public photos."}
        </p>
        {uploadError && <p role="alert">{ar ? "فشل رفع الصورة." : "Photo upload failed."}</p>}
        <div className="inspection-photo-list">
          {paths.map((p, i) => (
            <div key={p}>
              <span>
                {ar ? "صورة الزيارة" : "Visit photo"} {i + 1}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaths((v) => v.filter((x) => x !== p))}
              >
                {ar ? "إزالة" : "Remove"}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <input type="hidden" name="photo_paths" value={JSON.stringify(paths)} />
      <div className="field">
        <label htmlFor={`inspection-outcome-${requestId}`}>{ar ? "النتيجة" : "Outcome"}</label>
        <Select id={`inspection-outcome-${requestId}`} name="outcome" defaultValue="incomplete">
          <option value="incomplete">
            {ar ? "غير مكتمل — بدون علامة" : "Incomplete — no watermark"}
          </option>
          <option value="failed">{ar ? "لم ينجح — بدون علامة" : "Failed — no watermark"}</option>
          <option value="passed">
            {ar ? "ناجح — منح PCX Inspected" : "Passed — award PCX Inspected"}
          </option>
        </Select>
      </div>
      <label className="check-label">
        <input type="checkbox" name="attended" value="yes" required />
        {ar
          ? "فحصت هذا الجهاز شخصيًا وسجلت النتائج الفعلية."
          : "I physically inspected this device and recorded the actual results."}
      </label>
      <Button disabled={pending || uploading || paths.length === 0}>
        {ar ? "نشر تقرير الفحص" : "Publish inspection report"}
      </Button>
    </form>
  );
}
