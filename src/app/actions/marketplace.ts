"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale, type Locale } from "@/lib/domain";
import { requireUser, requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { contactSchema, listingSchema } from "@/lib/marketplace-validation";
import { egpToPiastres } from "@/lib/money";
import { sanitizeProductPhoto } from "@/lib/uploads";
import { getSupabaseConfig } from "@/lib/env";
import type { MarketplaceState } from "@/lib/action-state";
const failure = (locale: Locale): MarketplaceState => ({
  error:
    locale === "ar"
      ? "تعذر الحفظ. راجع البيانات وحدّث الصفحة لو اتغير الإعلان، ثم حاول تاني."
      : "Could not save. Check the fields and reload if the listing changed, then try again.",
});
export async function saveProfile(
  locale: Locale,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale)) return { error: "Invalid language" };
  await requireUser(locale);
  const data = contactSchema.safeParse(
    Object.fromEntries(
      ["display_name", "governorate", "phone", "social_url"].map((k) => [k, form.get(k) || ""]),
    ),
  );
  if (!data.success) return failure(locale);
  const client = await createSupabaseClient();
  if (!client) return failure(locale);
  const { error } = await client.rpc("save_contact", { data: data.data });
  if (error) return failure(locale);
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account/listings`);
}
export async function saveListing(
  locale: Locale,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  return persistListing(locale, form, false);
}
export async function saveAdminListing(
  locale: Locale,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  return persistListing(locale, form, true);
}
async function persistListing(
  locale: Locale,
  form: FormData,
  admin: boolean,
): Promise<MarketplaceState> {
  if (!isLocale(locale)) return { error: "Invalid language" };
  if (admin) await requireStaff(locale);
  else await requireUser(locale);
  let specifications: unknown, image_paths: unknown;
  try {
    specifications = JSON.parse(String(form.get("specifications")));
    image_paths = JSON.parse(String(form.get("image_paths")));
  } catch {
    return failure(locale);
  }
  const parsed = listingSchema.safeParse({
    ...Object.fromEntries(
      [
        "title",
        "category_slug",
        "brand",
        "model",
        "description",
        "known_defects",
        "condition",
        "price",
        "governorate",
        "status",
      ].map((k) => [k, form.get(k)]),
    ),
    specifications,
    image_paths,
    ...(form.get("id")
      ? { id: form.get("id"), expected_updated_at: form.get("expected_updated_at") }
      : {}),
  });
  if (!parsed.success)
    return {
      error:
        locale === "ar"
          ? "راجع الحقول المطلوبة، ومواصفات الجهاز والصور. وضّح إن كانت حالة أي جزء لم تُختبر."
          : parsed.error.issues[0]?.message || "Check the required fields.",
    };
  const client = await createSupabaseClient();
  if (!client) return failure(locale);
  const { price, ...rest } = parsed.data;
  const { data, error } = await client.rpc("save_marketplace_listing", {
    data: { ...rest, price_piastres: egpToPiastres(price) },
  });
  if (error) return failure(locale);
  revalidatePath(`/${locale}`, "layout");
  redirect(
    admin
      ? `/${locale}/admin/products/seller/${data}?saved=1`
      : `/${locale}/account/listings/${data}?saved=1`,
  );
}
export async function uploadSellerPhoto(locale: Locale, form: FormData) {
  if (!isLocale(locale)) return { error: true };
  const account = await requireUser(locale);
  const client = await createSupabaseClient();
  const file = form.get("photo");
  if (
    !client ||
    !account.user?.email_confirmed_at ||
    !(file instanceof File) ||
    file.size > 3 * 1024 * 1024
  )
    return { error: true };
  try {
    const bytes = await sanitizeProductPhoto(new Uint8Array(await file.arrayBuffer()), file.type);
    const path = `marketplace/${account.user.id}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage
      .from("marketplace-images")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    return error ? { error: true } : { error: false, path };
  } catch {
    return { error: true };
  }
}
export async function submitBenchmark(
  locale: Locale,
  lid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(lid).success) return { error: "Invalid request" };
  const account = await requireUser(locale);
  const client = await createSupabaseClient();
  const config = getSupabaseConfig();
  const file = form.get("evidence");
  const revision = Number(form.get("revision"));
  if (
    !client ||
    !config ||
    !account.user?.email_confirmed_at ||
    !(file instanceof File) ||
    file.type !== "application/pdf" ||
    file.size > 3 * 1024 * 1024 ||
    !Number.isSafeInteger(revision) ||
    form.get("share") !== "yes"
  )
    return failure(locale);
  // getUser above authenticates; the access token is forwarded only to our configured backend.
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return failure(locale);
  try {
    const response = await fetch(`${config.url}/evidence/v1/submit/${lid}?revision=${revision}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: config.key,
        "Content-Type": "application/pdf",
      },
      body: await file.arrayBuffer(),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok)
      return {
        error:
          locale === "ar"
            ? "تعذر إرسال الملف. استخدم PDF غير محمي، حتى 12 صفحة و3 ميجابايت، وحدّث الصفحة لو اتغير الإعلان."
            : "Upload failed. Use an unlocked PDF, up to 12 pages and 3 MB. Reload if the listing changed.",
      };
  } catch {
    return failure(locale);
  }
  revalidatePath(`/${locale}/account/listings/${lid}`);
  revalidatePath(`/${locale}/listings/${lid}`);
  revalidatePath(`/${locale}/catalog`);
  return { success: true };
}
export async function reviewBenchmark(
  locale: Locale,
  sid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(sid).success) return { error: "Invalid request" };
  await requireStaff(locale);
  const client = await createSupabaseClient();
  if (!client) return failure(locale);
  const parsed = z
    .object({
      decision: z.enum(["approved", "changes_requested", "rejected"]),
      note: z.string().trim().max(2000),
    })
    .refine((value) =>
      value.decision === "approved"
        ? value.note.length === 0 || value.note.length >= 5
        : value.note.length >= 5,
    )
    .safeParse({ decision: form.get("decision"), note: form.get("note") });
  if (!parsed.success)
    return {
      error:
        locale === "ar"
          ? "اختر القرار واكتب سبب الرفض من ٥ أحرف على الأقل."
          : "Choose a decision. A refusal needs a comment of at least 5 characters.",
    };
  const { error } = await client.rpc("review_benchmark", { sid, ...parsed.data });
  if (error) return failure(locale);
  revalidatePath(`/${locale}/admin/benchmarks`);
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/admin/products`, "layout");
  revalidatePath(`/${locale}/account/listings`, "layout");
  return { success: true };
}
export async function moderateListing(locale: Locale, lid: string, form: FormData) {
  if (!isLocale(locale) || !z.uuid().safeParse(lid).success) return;
  await requireStaff(locale);
  const client = await createSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc("moderate_listing", {
    lid,
    hide: form.get("hide") === "true",
    reason: String(form.get("reason") || ""),
  });
  if (error) redirect(`/${locale}/admin/benchmarks?error=1`);
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/admin/benchmarks`);
}
