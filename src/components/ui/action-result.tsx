import type { MarketplaceState } from "@/lib/action-state";
import type { Locale } from "@/lib/domain";
export function ActionResult({ state, locale }: { state: MarketplaceState; locale: Locale }) {
  return state.error ? (
    <p role="alert" className="notice error">
      {state.error}
    </p>
  ) : state.success ? (
    <p role="status" className="notice">
      {locale === "ar" ? "تم الحفظ." : "Saved successfully."}
    </p>
  ) : null;
}
