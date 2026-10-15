"use server";
import { requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/domain";
import { sanitizeProductPhoto, MAX_PHOTO_BYTES } from "@/lib/uploads";
export async function uploadProductPhoto(locale: Locale, form: FormData) {
  if (!isLocale(locale)) return { error: true };
  await requireStaff(locale);
  const file = form.get("photo");
  if (!(file instanceof File) || file.size > MAX_PHOTO_BYTES) return { error: true };
  const client = await createSupabaseClient();
  if (!client) return { error: true };
  try {
    const image = await sanitizeProductPhoto(new Uint8Array(await file.arrayBuffer()), file.type);
    const path = `products/${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage
      .from("product-images")
      .upload(path, image, { contentType: "image/webp", upsert: false });
    if (error) return { error: true };
    return { error: false, path };
  } catch {
    return { error: true };
  }
}
