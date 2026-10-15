"use client";
import { useActionState, useId, useState } from "react";
import type { Locale } from "@/lib/domain";
import { ActionResult } from "./ui/action-result";
import {
  permanentlyDeleteProduct,
  retryDeletedFileCleanup,
} from "@/app/actions/product-operations";
import { permanentlyDeleteOwnListing, retryOwnFileCleanup } from "@/app/actions/seller-listings";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
export function PermanentDeleteForm({
  locale,
  source = "seller",
  audience = "admin",
  id,
  updatedAt,
  referenceCode,
}: {
  locale: Locale;
  source?: "seller" | "company";
  audience?: "admin" | "owner";
  id: string;
  updatedAt: string;
  referenceCode: string;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(
    audience === "owner"
      ? permanentlyDeleteOwnListing.bind(null, locale, id)
      : permanentlyDeleteProduct.bind(null, locale, source, id),
    {},
  );
  const fieldId = useId();
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <details className="panel permanent-deletion">
      <summary>{ar ? "حذف المنتج نهائيًا" : "Permanently delete product"}</summary>
      <form action={action} className="market-form">
        <p>
          {audience === "owner"
            ? ar
              ? "لا يمكن التراجع عن هذا الحذف. سيتم حذف الإعلان وطلبات المراجعة وتقارير الفحص وملفاته غير المشتركة. يُحتفظ بسجل الإجراء."
              : "This cannot be undone. Your listing, review applications, inspection reports and unshared files will be removed. An audit record is kept."
            : ar
              ? "لا يمكن التراجع عن الحذف. سيتم حذف المنتج وطلبات المراجعة وتقارير الفحص وملفاته غير المشتركة مع منتجات أخرى. يُحتفظ بسجل الإجراء الإداري. المنتجات المرتبطة بطلبات شراء لا تُحذف نهائيًا."
              : "This cannot be undone. It removes the product, review applications, inspection reports and files not shared with other products. The admin audit record is kept. Products with order history cannot be permanently deleted."}
        </p>
        <ActionResult state={state} locale={locale} />
        <input type="hidden" name="expected_updated_at" value={updatedAt} />
        <div className="field">
          <label htmlFor={`${fieldId}-reference`}>
            {ar ? `اكتب ${referenceCode} للتأكيد` : `Type ${referenceCode} to confirm`}
          </label>
          <Input
            id={`${fieldId}-reference`}
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {audience === "admin" && (
          <div className="field">
            <label htmlFor={`${fieldId}-reason`}>
              {ar ? "سبب الحذف النهائي" : "Reason for permanent deletion"}
            </label>
            <Textarea
              id={`${fieldId}-reason`}
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={5}
              maxLength={500}
            />
          </div>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            name="confirm_permanent"
            value="yes"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {ar
            ? "أفهم أن هذا الحذف لا يمكن استعادته."
            : "I understand this deletion cannot be restored."}
        </label>
        <Button variant="destructive" disabled={pending}>
          {ar ? "حذف نهائي" : "Delete permanently"}
        </Button>
      </form>
    </details>
  );
}
export function DeletedFileCleanup({
  locale,
  audience = "admin",
}: {
  locale: Locale;
  audience?: "admin" | "owner";
}) {
  const [state, action, pending] = useActionState(
    (audience === "owner" ? retryOwnFileCleanup : retryDeletedFileCleanup).bind(null, locale),
    {},
  );
  const ar = locale === "ar";
  return (
    <form action={action} className="notice">
      <p>
        {ar
          ? "تم حذف المنتجات؛ توجد ملفات في انتظار اكتمال التنظيف."
          : "The products are deleted. Some associated files still need cleanup."}
      </p>
      <ActionResult state={state} locale={locale} />
      <Button disabled={pending}>{ar ? "إعادة محاولة حذف الملفات" : "Retry file cleanup"}</Button>
    </form>
  );
}
