import "server-only";
import { z } from "zod";
const schema = z.object({
  url: z
    .url()
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Use an HTTP(S) Supabase URL.",
    ),
  key: z
    .string()
    .min(20)
    .refine((v) => !v.startsWith("sb_secret_"), "Use a publishable key, never a secret key."),
});
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  const result = schema.safeParse({ url, key });
  if (!result.success)
    throw new Error(
      "Invalid Supabase configuration. Check the URL and publishable key in .env.local.",
    );
  if (key?.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (payload.role !== "anon") throw new Error("Invalid key role");
    } catch {
      throw new Error("The public Supabase key must be a publishable or legacy anon key.");
    }
  }
  return result.data;
}
export function siteUrl() {
  return z.url().parse(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}
