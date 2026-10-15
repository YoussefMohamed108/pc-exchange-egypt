"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase/server";
import { requireUser, requireStaff } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import { getProductsByIds } from "@/lib/catalog";
import { isLocale, type Locale, type Product } from "@/lib/domain";
export async function loadCart(
  ids: unknown,
): Promise<{ products: Product[]; methods: string[]; error: boolean }> {
  const parsed = z.array(z.uuid()).max(30).safeParse(ids);
  if (!parsed.success) return { products: [], methods: [], error: true };
  const client = await createSupabaseClient();
  if (!client) return { products: [], methods: [], error: false };
  try {
    const [products, settings] = await Promise.all([
      getProductsByIds(parsed.data),
      client.from("platform_settings").select("value").eq("key", "payment_methods").maybeSingle(),
    ]);
    return {
      products,
      methods: Array.isArray(settings.data?.value)
        ? settings.data.value.filter((v): v is string => typeof v === "string")
        : [],
      error: !!settings.error,
    };
  } catch {
    return { products: [], methods: [], error: true };
  }
}
export async function checkout(locale: Locale, input: unknown) {
  if (!isLocale(locale)) return { error: true };
  await requireUser(locale);
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: true };
  const client = await createSupabaseClient();
  if (!client) return { error: true };
  const { items, payment_method, phone, idempotency_key } = parsed.data;
  const { data, error } = await client.rpc("place_order", {
    p_items: items,
    p_payment_method: payment_method,
    p_phone: phone,
    p_idempotency_key: idempotency_key,
  });
  if (error || !data) return { error: true };
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/account`);
  return { error: false, id: data };
}
export async function processOrder(locale: Locale, orderId: string, action: string) {
  if (!isLocale(locale)) return { error: true };
  await requireStaff(locale);
  if (
    !z.uuid().safeParse(orderId).success ||
    !z.enum(["verify_payment", "confirm", "ready", "complete", "cancel"]).safeParse(action).success
  )
    return { error: true };
  const client = await createSupabaseClient();
  if (!client) return { error: true };
  const { error } = await client.rpc("process_order", { p_order_id: orderId, p_action: action });
  if (error) return { error: true };
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/orders`);
  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/account`);
  return { error: false };
}
export async function submitReference(locale: Locale, orderId: string, form: FormData) {
  if (!isLocale(locale)) return;
  await requireUser(locale);
  const parsed = z
    .object({ id: z.uuid(), reference: z.string().trim().min(3).max(200) })
    .safeParse({ id: orderId, reference: form.get("reference") });
  if (!parsed.success) return;
  const client = await createSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc("submit_payment_reference", {
    p_order_id: parsed.data.id,
    p_reference: parsed.data.reference,
  });
  if (error) throw new Error("Payment reference could not be submitted.");
  revalidatePath(`/${locale}/account`);
}
