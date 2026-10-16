"use client";
import { useActionState, useState } from "react";
import type { Locale } from "@/lib/domain";
import type { ListingReviewHistory, SellerListing } from "@/lib/marketplace-validation";
import { listingReviewLabel } from "@/lib/listing-status";
import { reviewListing } from "@/app/actions/listing-reviews";
import type { MarketplaceState } from "@/lib/action-state";
import { ActionResult } from "./ui/action-result";
import { Button } from "./ui/button";
import { Select, Textarea } from "./ui/input";
export function ListingReviewState({
  locale,
  listing,
  history,
}: {
  locale: Locale;
  listing: SellerListing;
  history?: ListingReviewHistory[];
}) {
  const ar = locale === "ar";
  return (
    <section className="panel">
      <h2>{ar ? "مراجعة نشر الإعلان" : "Listing publication review"}</h2>
      <p className="badge">{listingReviewLabel(listing.review_status, locale)}</p>
      {listing.review_note && <p className="notice">{listing.review_note}</p>}
      <p>
        {ar
          ? "الموافقة على النشر لا تعني مراجعة الاختبارات أو إجراء فحص ميداني. لإعادة الإرسال، عدّل الإعلان واختر إرسال للمراجعة."
          : "Publication approval is separate from benchmark review and physical inspection. To resubmit, edit the listing and choose Submit for review."}
      </p>
      {history && (
        <details>
          <summary>{ar ? "سجل قرارات النشر" : "Publication decision history"}</summary>
          {history.length ? (
            history.map((h) => (
              <article className="audit-entry" key={h.id}>
                <strong>{listingReviewLabel(h.decision, locale)}</strong>
                <p>
                  {ar ? "النسخة" : "Revision"} {h.revision} ·{" "}
                  <time dateTime={h.reviewed_at}>
                    {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Cairo",
                    }).format(new Date(h.reviewed_at))}
                  </time>
                </p>
                {h.note && <p>{h.note}</p>}
              </article>
            ))
          ) : (
            <p>{ar ? "لا توجد قرارات سابقة." : "No decisions recorded."}</p>
          )}
        </details>
      )}
    </section>
  );
}
export function ListingReviewForm({ locale, listing }: { locale: Locale; listing: SellerListing }) {
  const ar = locale === "ar";
  const [decision, setDecision] = useState("");
  const [state, action, pending] = useActionState(
    reviewListing.bind(null, locale, listing.id),
    {} as MarketplaceState,
  );
  const required = decision === "rejected" || decision === "changes_requested";
  return (
    <form action={action} className="market-form">
      <ActionResult state={state} locale={locale} />
      <input type="hidden" name="expected_updated_at" value={listing.updated_at} />
      <div className="field">
        <label htmlFor={`publication-${listing.id}`}>
          {ar ? "قرار النشر" : "Publication decision"}
        </label>
        <Select
          id={`publication-${listing.id}`}
          name="decision"
          required
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          <option value="" disabled>
            {ar ? "اختر القرار" : "Choose a decision"}
          </option>
          <option value="approved">{ar ? "الموافقة على النشر" : "Approve publication"}</option>
          <option value="changes_requested">{ar ? "طلب تعديلات" : "Request changes"}</option>
          <option value="rejected">{ar ? "رفض النشر" : "Refuse publication"}</option>
        </Select>
      </div>
      <div className="field">
        <label htmlFor={`publication-note-${listing.id}`}>
          {required
            ? ar
              ? "السبب (مطلوب ويظهر للبائع)"
              : "Reason (required, shown to seller)"
            : ar
              ? "تعليق للبائع (اختياري)"
              : "Comment to seller (optional)"}
        </label>
        <Textarea
          id={`publication-note-${listing.id}`}
          name="note"
          minLength={5}
          maxLength={2000}
          required={required}
        />
      </div>
      <p>
        {ar
          ? "هذا القرار يخص نشر الإعلان فقط ولا يمنح علامة فحص أو اختبارات، ولا يزيل قيود الإدارة."
          : "This decision covers publication only. It awards no benchmark or inspection badge and does not clear admin restrictions."}
      </p>
      <Button disabled={pending}>{ar ? "حفظ قرار النشر" : "Save publication decision"}</Button>
    </form>
  );
}
