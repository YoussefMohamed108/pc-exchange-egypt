"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/domain";
import { createSupabaseClient } from "@/lib/supabase/server";
import type { MarketplaceState } from "@/lib/action-state";
import { cleanDeletedFiles, permanentDeletionSchema } from "@/lib/product-deletion";

export async function permanentlyDeleteOwnListing(
  locale: Locale,
  lid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(lid).success) return { error: "Invalid request" };
  await requireUser(locale);
  const parsed = permanentDeletionSchema.safeParse(Object.fromEntries(form));
  const failure = {
    error:
      locale === "ar"
        ? "تعذر الحذف. اكتب معرف الإعلان بالضبط وأكد الحذف النهائي. حدّث الصفحة إذا تغير الإعلان."
        : "Could not delete. Type the listing ID exactly and confirm permanent deletion. Reload if the listing changed.",
  };
  if (!parsed.success) return failure;
  const client = await createSupabaseClient();
  if (!client) return failure;
  const { confirmation, expected_updated_at } = parsed.data;
  const result = await client.rpc("seller_delete_listing", {
    lid,
    confirmation,
    expected_updated_at,
  });
  if (result.error) return failure;
  await cleanDeletedFiles("owner").catch(() => false);
  for (const language of ["en", "ar"]) revalidatePath(`/${language}`, "layout");
  redirect(`/${locale}/account/listings?notice=permanently_deleted`);
}

export async function retryOwnFileCleanup(
  locale: Locale,
  _state: MarketplaceState,
): Promise<MarketplaceState> {
  if (!isLocale(locale)) return { error: "Invalid request" };
  await requireUser(locale);
  const done = await cleanDeletedFiles("owner").catch(() => false);
  revalidatePath(`/${locale}/account/listings`);
  return done
    ? { success: true }
    : {
        error:
          locale === "ar"
            ? "بعض الملفات ما زالت في الانتظار. حاول مرة أخرى."
            : "Some files are still pending. Retry cleanup.",
      };
}

export async function manageSellerListing(
  locale: Locale,
  lid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(lid).success) return { error: "Invalid request" };
  await requireUser(locale);
  const failure = {
    error:
      locale === "ar"
        ? "تعذر تغيير الحالة. حدّث الصفحة وحاول مرة أخرى. لا يمكنك إلغاء إيقاف أو حذف أجرته الإدارة."
        : "Could not change the status. Reload and try again. Admin restrictions cannot be undone here.",
  };
  const parsed = z
    .object({
      operation: z.enum(["pause", "resume", "sold", "relist", "delete", "restore"]),
      expected_updated_at: z.string().min(10),
      confirmation: z.string().max(40),
    })
    .safeParse({
      operation: form.get("operation"),
      expected_updated_at: form.get("expected_updated_at"),
      confirmation: form.get("confirmation") || "",
    });
  if (
    !parsed.success ||
    (parsed.data.operation === "delete" && form.get("confirm_delete") !== "yes")
  )
    return failure;
  const client = await createSupabaseClient();
  if (!client) return failure;
  const { error } = await client.rpc("seller_listing_action", { lid, ...parsed.data });
  if (error) return failure;
  for (const language of ["en", "ar"]) revalidatePath(`/${language}`, "layout");
  if (parsed.data.operation === "delete") redirect(`/${locale}/account/listings?notice=deleted`);
  return { success: true };
}
