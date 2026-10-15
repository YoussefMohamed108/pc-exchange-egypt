import type { MetadataRoute } from "next";
import { createSupabaseClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(),
    client = await createSupabaseClient();
  const urls: MetadataRoute.Sitemap = ["en", "ar"].flatMap((locale) =>
    ["", "/catalog", "/verification", "/benchmarks"].map((path) => ({
      url: `${base}/${locale}${path}`,
    })),
  );
  if (client) {
    const { data, error } = await client
      .from("public_products")
      .select("slug,created_at")
      .limit(1000);
    if (error) throw new Error("Sitemap could not be generated.");
    for (const p of data || [])
      for (const locale of ["en", "ar"])
        urls.push({ url: `${base}/${locale}/products/${p.slug}`, lastModified: p.created_at });
  }
  return urls;
}
