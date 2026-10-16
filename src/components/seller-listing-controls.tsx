"use client";

import { useActionState, useState } from "react";
import { Check, Pause, Play, Trash2, Undo2 } from "lucide-react";
import { manageSellerListing } from "@/app/actions/seller-listings";
import type { Locale } from "@/lib/domain";
import type { SellerListing } from "@/lib/marketplace-validation";
import { Button } from "./ui/button";
import { PermanentDeleteForm } from "./permanent-delete-form";
import { sellerStatusLabel } from "@/lib/listing-status";

export function SellerListingControls({
  locale,
  listing,
}: {
  locale: Locale;
  listing: SellerListing;
}) {
  const ar = locale === "ar";
  const [state, action, pending] = useActionState(
    manageSellerListing.bind(null, locale, listing.id),
    {},
  );
  const [confirmed, setConfirmed] = useState(false);
  const deleted = !!listing.deleted_at;
  const stamp = <input type="hidden" name="expected_updated_at" value={listing.updated_at} />;
  return (
    <div
      className="seller-controls"
      aria-label={`${ar ? "إدارة" : "Manage"} ${listing.reference_code}`}
    >
      <p className="seller-availability" role="status">
        {deleted
          ? ar
            ? "محذوف — غير ظاهر للمشترين"
            : "Deleted — unavailable to buyers"
          : listing.hidden
            ? ar
              ? "متوقف بواسطة الإدارة — تواصل مع الفريق لاستئنافه"
              : "Paused by admin — contact the team to resume"
            : `${sellerStatusLabel(listing.status, locale)} · ${
                listing.status === "listed" && listing.review_status === "approved"
                  ? ar
                    ? "ظاهر للمشترين"
                    : "Visible to buyers"
                  : ar
                    ? "غير ظاهر للمشترين"
                    : "Unavailable to buyers"
              }`}
      </p>
      <form action={action} className="seller-quick-actions">
        {stamp}
        {deleted ? (
          listing.seller_deleted && (
            <Button name="operation" value="restore" variant="outline" size="sm" disabled={pending}>
              <Undo2 size={16} />
              {ar ? "استعادة كمسودة" : "Restore as draft"}
            </Button>
          )
        ) : (
          <>
            {listing.status !== "sold" && (
              <Button
                name="operation"
                value="sold"
                variant="secondary"
                size="sm"
                disabled={pending}
              >
                <Check size={16} />
                {ar ? "تم البيع" : "Mark as sold"}
              </Button>
            )}
            {listing.status === "listed" && !listing.hidden && (
              <Button name="operation" value="pause" variant="outline" size="sm" disabled={pending}>
                <Pause size={16} />
                {ar ? "إيقاف مؤقت" : "Pause listing"}
              </Button>
            )}
            {listing.status === "paused" && !listing.hidden && (
              <Button name="operation" value="resume" size="sm" disabled={pending}>
                <Play size={16} />
                {ar ? "استئناف الإعلان" : "Resume listing"}
              </Button>
            )}
            {["sold", "archived"].includes(listing.status) && !listing.hidden && (
              <Button
                name="operation"
                value="relist"
                variant="outline"
                size="sm"
                disabled={pending}
              >
                <Undo2 size={16} />
                {ar ? "إعادة النشر" : "Relist product"}
              </Button>
            )}
          </>
        )}
      </form>
      {!deleted && (
        <details className="seller-delete">
          <summary>
            <Trash2 size={15} />
            {ar ? "حذف الإعلان" : "Delete listing"}
          </summary>
          <form action={action}>
            {stamp}
            <input type="hidden" name="operation" value="delete" />
            <input type="hidden" name="confirmation" value={listing.reference_code} />
            <p>
              {ar
                ? "سينتقل الإعلان إلى المحذوفات ويختفي من الموقع. يمكنك استعادته كمسودة أو حذفه نهائيًا."
                : "Moves this listing to Deleted and removes it from the marketplace. You can restore it as a draft or delete it permanently."}
            </p>
            <label className="seller-delete-confirm">
              <input
                type="checkbox"
                name="confirm_delete"
                value="yes"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={pending}
              />
              {ar
                ? `أؤكد حذف ${listing.reference_code}`
                : `Confirm deletion of ${listing.reference_code}`}
            </label>
            <Button variant="destructive" size="sm" disabled={pending || !confirmed}>
              {ar ? "نقل إلى المحذوفات" : "Move to Deleted"}
            </Button>
          </form>
        </details>
      )}
      <PermanentDeleteForm
        locale={locale}
        audience="owner"
        id={listing.id}
        updatedAt={listing.updated_at}
        referenceCode={listing.reference_code}
      />
      {pending && <p role="status">{ar ? "جاري التحديث…" : "Updating…"}</p>}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
