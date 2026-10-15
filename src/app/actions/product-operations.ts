"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type Locale } from "@/lib/domain";
import { requireStaff, requireUser } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import type { MarketplaceState } from "@/lib/action-state";
import { cleanDeletedFiles, permanentDeletionSchema } from "@/lib/product-deletion";

const failed = (locale: Locale): MarketplaceState => ({
  error:
    locale === "ar"
      ? "تعذر الحفظ. راجع البيانات وحدّث الصفحة إذا تغير المنتج أو الطلب."
      : "Could not save. Check the required fields and reload if the product or request changed.",
});
function refresh(locale: Locale) {
  revalidatePath(`/${locale}`, "layout");
}
export async function manageProduct(
  locale: Locale,
  source: string,
  id: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (
    !isLocale(locale) ||
    !z.uuid().safeParse(id).success ||
    !["seller", "company"].includes(source)
  )
    return { error: "Invalid request" };
  await requireStaff(locale);
  const data = z
    .object({
      operation: z.enum([
        "pause",
        "resume",
        "delete",
        "restore",
        "revoke_benchmark",
        "revoke_inspection",
      ]),
      reason: z.string().trim().min(5).max(500),
      expected_updated_at: z.string().min(10),
    })
    .safeParse(
      Object.fromEntries(
        ["operation", "reason", "expected_updated_at"].map((k) => [
          k,
          k === "operation" ? form.get("quick_operation") || form.get(k) : form.get(k),
        ]),
      ),
    );
  if (!data.success || (data.data.operation === "delete" && form.get("confirm_delete") !== "yes"))
    return failed(locale);
  const client = await createSupabaseClient();
  if (!client) return failed(locale);
  const { error } = await client.rpc("admin_product_action", { source, pid: id, ...data.data });
  if (error) return failed(locale);
  refresh(locale);
  return { success: true };
}
export async function permanentlyDeleteProduct(
  locale: Locale,
  source: string,
  id: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (
    !isLocale(locale) ||
    !["seller", "company"].includes(source) ||
    !z.uuid().safeParse(id).success
  )
    return { error: "Invalid request" };
  await requireStaff(locale);
  const parsed = permanentDeletionSchema
    .extend({ reason: z.string().trim().min(5).max(500) })
    .safeParse(
      Object.fromEntries(
        ["expected_updated_at", "confirmation", "reason", "confirm_permanent"].map((k) => [
          k,
          form.get(k),
        ]),
      ),
    );
  if (!parsed.success)
    return {
      error:
        locale === "ar"
          ? "اكتب معرف المنتج الصحيح والسبب وأكد الحذف النهائي."
          : "Enter the product ID and reason, and confirm permanent deletion.",
    };
  const client = await createSupabaseClient();
  if (!client) return failed(locale);
  const { confirmation, reason, expected_updated_at } = parsed.data;
  const result = await client.rpc("admin_delete_product", {
    source,
    pid: id,
    confirmation,
    reason,
    expected_updated_at,
  });
  if (result.error)
    return {
      error: result.error.message.includes("order history")
        ? locale === "ar"
          ? "هذا المنتج مرتبط بطلبات شراء. استخدم الحذف القابل للاستعادة للحفاظ على سجل الطلبات."
          : "This product has order history. Use recoverable deletion to preserve those orders."
        : locale === "ar"
          ? "تعذر الحذف. طابق معرف المنتج وحدّث الصفحة إذا تغير المنتج."
          : "Could not delete. Match the product ID exactly and reload if the product changed.",
    };
  // The database commits the deletion and a durable cleanup list first. Interrupted storage
  // removal can be retried from All products without restoring the deleted product.
  await cleanDeletedFiles("admin").catch(() => false);
  refresh(locale);
  redirect(`/${locale}/admin/products?notice=permanently_deleted`);
}
export async function retryDeletedFileCleanup(
  locale: Locale,
  _state: MarketplaceState,
): Promise<MarketplaceState> {
  if (!isLocale(locale)) return { error: "Invalid request" };
  await requireStaff(locale);
  const done = await cleanDeletedFiles("admin").catch(() => false);
  refresh(locale);
  return done
    ? { success: true }
    : {
        error:
          locale === "ar"
            ? "بعض الملفات ما زالت في الانتظار. حاول مرة أخرى."
            : "Some files are still pending. Retry cleanup.",
      };
}
export async function requestInspection(
  locale: Locale,
  lid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(lid).success) return { error: "Invalid request" };
  await requireUser(locale);
  const parsed = z
    .object({
      expected_revision: z.coerce.number().int().positive(),
      note: z.string().trim().min(5).max(500),
    })
    .safeParse({ expected_revision: form.get("revision"), note: form.get("note") });
  const client = await createSupabaseClient();
  if (!parsed.success || !client) return failed(locale);
  const { error } = await client.rpc("request_field_inspection", { lid, ...parsed.data });
  if (error) return failed(locale);
  refresh(locale);
  return { success: true };
}
export async function manageInspection(
  locale: Locale,
  rid: string,
  admin: boolean,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(rid).success) return { error: "Invalid request" };
  if (admin) await requireStaff(locale);
  else await requireUser(locale);
  const decision = admin ? String(form.get("decision")) : "cancelled";
  const parsed = z
    .object({
      decision: z.enum(["scheduled", "declined", "cancelled"]),
      note: z.string().trim().min(5).max(1000),
      appointment: z.iso.datetime().nullable(),
    })
    .safeParse({
      decision,
      note: form.get("note"),
      appointment: decision === "scheduled" ? form.get("appointment") : null,
    });
  const client = await createSupabaseClient();
  if (!parsed.success || !client) return failed(locale);
  const { error } = await client.rpc("manage_inspection_request", { rid, ...parsed.data });
  if (error) return failed(locale);
  refresh(locale);
  return { success: true };
}
export async function publishFieldReport(
  locale: Locale,
  rid: string,
  _state: MarketplaceState,
  form: FormData,
): Promise<MarketplaceState> {
  if (!isLocale(locale) || !z.uuid().safeParse(rid).success) return { error: "Invalid request" };
  await requireStaff(locale);
  let checks: unknown, photo_paths: unknown;
  try {
    checks = JSON.parse(String(form.get("checks")));
    photo_paths = JSON.parse(String(form.get("photo_paths")));
  } catch {
    return failed(locale);
  }
  const parsed = z
    .object({
      inspected_on: z.iso.date(),
      identity_description: z.string().trim().min(5).max(500),
      serial_number: z.string().trim().min(4).max(200),
      findings: z.string().trim().min(10).max(3000),
      known_defects: z.string().trim().min(2).max(2000),
      outcome: z.enum(["passed", "failed", "incomplete"]),
      attended: z.literal("yes"),
      checks: z.record(
        z.string(),
        z.object({
          result: z.enum(["pass", "fail", "not_tested"]),
          notes: z.string().trim().min(3).max(500),
        }),
      ),
      photo_paths: z
        .array(z.string().regex(/^marketplace\/[a-f0-9-]+\/[a-f0-9-]+\.webp$/))
        .min(1)
        .max(8),
    })
    .safeParse({
      ...Object.fromEntries(
        [
          "inspected_on",
          "identity_description",
          "serial_number",
          "findings",
          "known_defects",
          "outcome",
          "attended",
        ].map((k) => [k, form.get(k)]),
      ),
      checks,
      photo_paths,
    });
  const client = await createSupabaseClient();
  if (!client || !parsed.success) return failed(locale);
  const { error } = await client.rpc("publish_field_inspection", {
    data: { request_id: rid, ...parsed.data },
  });
  if (error) return failed(locale);
  refresh(locale);
  return { success: true };
}
