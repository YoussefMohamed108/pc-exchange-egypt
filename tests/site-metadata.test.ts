import { afterEach, expect, it, vi } from "vitest";
import { publicPageMetadata } from "@/lib/site-metadata";
afterEach(() => vi.unstubAllEnvs());
it("uses the configured production domain and bilingual route alternates", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pc-ex.store/");
  vi.stubEnv("VERCEL_URL", "preview.vercel.app");
  expect(publicPageMetadata("ar", "/catalog?category=memory", "catalog").alternates).toEqual({
    canonical: "https://pc-ex.store/ar/catalog",
    languages: { en: "https://pc-ex.store/en/catalog", ar: "https://pc-ex.store/ar/catalog" },
  });
});
it("retains the deployment preview origin and distinct detail route", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "preview.vercel.app");
  expect(publicPageMetadata("en", "listings/abc", "listing").alternates?.canonical).toBe(
    "https://preview.vercel.app/en/listings/abc",
  );
});
it("keeps localized home canonicals on localhost", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "");
  expect(publicPageMetadata("ar", "/", "home").alternates?.canonical).toBe(
    "http://localhost:3000/ar",
  );
});
it("normalizes route variants without confusing route identity", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pc-ex.store");
  expect(
    publicPageMetadata("en", "/benchmarks/?view=gaming#compare", "benchmarks").alternates
      ?.canonical,
  ).toBe("https://pc-ex.store/en/benchmarks");
  expect(publicPageMetadata("en", "/products/gpu", "gpu").alternates?.canonical).toBe(
    "https://pc-ex.store/en/products/gpu",
  );
});
