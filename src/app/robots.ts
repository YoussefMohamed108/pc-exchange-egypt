import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/en/admin",
        "/ar/admin",
        "/en/account",
        "/ar/account",
        "/en/auth",
        "/ar/auth",
        "/en/cart",
        "/ar/cart",
        "/auth/",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
