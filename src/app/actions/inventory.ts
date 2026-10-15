"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { inventorySchema, inspectionSchema } from "@/lib/validation";
import { isLocale, type Locale } from "@/lib/domain";
import { egpToPiastres } from "@/lib/money";
export async function saveInventory(locale: Locale, input: unknown) {
  if (!isLocale(locale)) return { error: true };
  await requireStaff(locale);
  const parsed = inventorySchema.safeParse(input);
  if (!parsed.success) return { error: true };
  const client = await createSupabaseClient();
  if (!client) return { error: true };
  const { price, purchase_cost, ...data } = parsed.data;
  const { error } = await client.rpc("save_inventory", {
    data: {
      ...data,
      price_piastres: egpToPiastres(price),
      purchase_cost_piastres: egpToPiastres(purchase_cost),
    },
  });
  if (error) {
    console.error("inventory.save_failed", { code: error.code });
    return { error: true };
  }
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}`);
  return { error: false };
}
export async function publishInspection(locale: Locale, input: unknown) {
  if (!isLocale(locale)) return { error: true };
  await requireStaff(locale, "inspection");
  const parsed = inspectionSchema.safeParse(input);
  if (!parsed.success) return { error: true };
  const client = await createSupabaseClient();
  if (!client) return { error: true };
  const { data, error } = await client.rpc("publish_inspection", { data: parsed.data });
  if (error || !data) return { error: true };
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/admin/inspections`);
  return { error: false, id: data };
}
