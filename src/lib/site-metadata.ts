import type { Metadata } from "next";
import type { Locale } from "./domain";
import { siteUrl } from "./env";

/** Canonicalize public route identity; filters and UI views share the base route. */
export function publicPageMetadata(
  locale: Locale,
  route: string,
  title: string,
  description?: string,
): Metadata {
  const path = route.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
  const origin = new URL(siteUrl()).origin;
  const localized = (language: Locale) => `${origin}/${language}${path ? `/${path}` : ""}`;
  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: localized(locale),
      languages: { en: localized("en"), ar: localized("ar") },
    },
  };
}
