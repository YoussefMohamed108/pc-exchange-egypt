"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/domain";
import { createSupabaseClient } from "@/lib/supabase/server";
import { listingReviewSchema } from "@/lib/marketplace-validation";
import type { MarketplaceState } from "@/lib/action-state";
export async function reviewListing(
  locale: Locale,
  lid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale)) return { error: "Invalid language" };
  await requireStaff(locale);
  const parsed = listingReviewSchema.safeParse({
    lid,
    expected_updated_at: form.get("expected_updated_at"),
    decision: form.get("decision"),
    note: form.get("note"),
  });
  if (!parsed.success)
    return {
      error:
        locale === "ar"
          ? "اختر القرار واكتب سببًا من ٥ أحرف على الأقل عند الرفض أو طلب التعديلات."
          : "Choose a decision. Refusal or changes require a reason of at least 5 characters.",
    };
  const client = await createSupabaseClient();
  if (!client) return { error: locale === "ar" ? "المراجعة غير متاحة." : "Review unavailable." };
  const { error } = await client.rpc("review_listing", parsed.data);
  if (error)
    return {
      error:
        locale === "ar"
          ? "تعذرت المراجعة. حدّث الصفحة؛ ربما تغيّر الإعلان أو تمت مراجعته."
          : "Could not review. Reload; the listing may have changed or already been reviewed.",
    };
  for (const language of ["en", "ar"]) revalidatePath(`/${language}`, "layout");
  return { success: true };
}
