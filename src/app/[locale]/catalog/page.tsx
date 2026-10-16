import { publicPageMetadata } from "@/lib/site-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { isLocale, categorySlugs } from "@/lib/domain";
import { dictionary, categoryName } from "@/lib/i18n";
import { catalogFiltersSchema } from "@/lib/validation";
import { getCatalog, PAGE_SIZE } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicPageMetadata(
    locale,
    "/catalog",
    locale === "ar" ? "كتالوج الأجهزة" : "Hardware catalog",
  );
}
export default async function Catalog({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale),
    raw = await searchParams;
  const values = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => typeof v === "string" && v !== ""),
  ) as Record<string, string>;
  const parsed = catalogFiltersSchema.safeParse(values);
  const catalog = parsed.success ? await getCatalog(parsed.data) : null;
  const page = parsed.success ? parsed.data.page : 1;
  const pageLink = (p: number) => {
    const q = new URLSearchParams(values);
    q.set("page", String(p));
    return `/${locale}/catalog?${q}`;
  };
  return (
    <div className="container">
      <div className="page-heading">
        <div className="eyebrow">{t.selection}</div>
        <h1>
          {values.category === "laptops"
            ? locale === "ar"
              ? "لابتوبات."
              : "Laptops."
            : values.category === "pc-builds"
              ? locale === "ar"
                ? "أجهزة كمبيوتر كاملة."
                : "Complete PCs."
              : t.catalogTitle}
        </h1>
        <p>
          {values.category === "laptops"
            ? locale === "ar"
              ? "اختار جهازك للشغل أو الدراسة أو اللعب. راجع مواصفات كل لابتوب وحالة البطارية والشاشة والشاحن قبل التواصل مع البائع."
              : "Find your next laptop for work, study or play. Check the exact configuration, battery condition, display and included charger before contacting the seller."
            : values.category === "pc-builds"
              ? locale === "ar"
                ? "أجهزة مجمّعة بكل المكونات الأساسية. راجع مواصفات كل جهاز وحالته وما يشمله الإعلان."
                : "Assembled PCs with all essential components. Check each listing’s specifications, condition and included accessories."
              : t.catalogText}
        </p>
      </div>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <div className="filter-header">
            <h2>
              <SlidersHorizontal size={13} style={{ display: "inline", marginInlineEnd: 7 }} />
              {t.filters}
            </h2>
            <Link href={`/${locale}/catalog`}>{t.resetFilters}</Link>
          </div>
          <form action={`/${locale}/catalog`}>
            <div className="field">
              <label htmlFor="catalog-q">{t.searchLabel}</label>
              <Input id="catalog-q" type="search" name="q" defaultValue={values.q} />
            </div>
            <div className="field">
              <label htmlFor="category">{t.category}</label>
              <Select id="category" name="category" defaultValue={values.category || ""}>
                <option value="">{t.allCategories}</option>
                {categorySlugs.map((s) => (
                  <option value={s} key={s}>
                    {categoryName(s, locale)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="brand">{t.brand}</label>
              <Input id="brand" name="brand" defaultValue={values.brand} />
            </div>
            <div className="filter-prices">
              <div className="field">
                <label htmlFor="min">{t.minPrice}</label>
                <Input
                  id="min"
                  name="min"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={values.min}
                />
              </div>
              <div className="field">
                <label htmlFor="max">{t.maxPrice}</label>
                <Input
                  id="max"
                  name="max"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={values.max}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="condition">{t.condition}</label>
              <Select id="condition" name="condition" defaultValue={values.condition || ""}>
                <option value="">{t.allHardware}</option>
                {(["A", "B", "C", "D"] as const).map((g) => (
                  <option key={g} value={g}>
                    {g} — {t[`grade${g}`]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="governorate">{t.location}</label>
              <Input id="governorate" name="governorate" defaultValue={values.governorate} />
            </div>
            {[
              { key: "verified", label: t.verifiedOnly },
              { key: "warranty", label: t.warrantyOnly },
              { key: "available", label: t.availableOnly },
            ].map(({ key, label }) => (
              <label className="check-field" key={key}>
                <input
                  type="checkbox"
                  name={key}
                  value="true"
                  defaultChecked={values[key] === "true"}
                />
                {label}
              </label>
            ))}
            <div className="field">
              <label htmlFor="sort">{t.sort}</label>
              <Select id="sort" name="sort" defaultValue={values.sort || "newest"}>
                <option value="newest">{t.newest}</option>
                <option value="price-asc">{t.priceAsc}</option>
                <option value="price-desc">{t.priceDesc}</option>
              </Select>
            </div>
            <Button type="submit">{t.applyFilters}</Button>
          </form>
        </aside>
        <section>
          <div className="catalog-toolbar">
            <span>{t.allHardware}</span>
            <span>
              {catalog?.count || 0} {t.results}
            </span>
          </div>
          {!parsed.success ? (
            <EmptyState title={t.invalidFilters} description={t.invalidFiltersText} />
          ) : catalog?.state === "error" ? (
            <EmptyState title={t.queryError} description={t.queryErrorText} />
          ) : catalog?.products.length ? (
            <>
              <div className="product-grid">
                {catalog.products.map((p) => (
                  <ProductCard product={p} locale={locale} key={p.id} />
                ))}
              </div>
              <nav className="pagination" aria-label="Pagination">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageLink(page - 1)}>{t.prev}</Link>
                  </Button>
                )}
                <span>
                  {page} / {Math.ceil(catalog.count / PAGE_SIZE)}
                </span>
                {page * PAGE_SIZE < catalog.count && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageLink(page + 1)}>{t.next}</Link>
                  </Button>
                )}
              </nav>
            </>
          ) : (
            <EmptyState title={t.noResults} description={t.noResultsText}>
              <Button asChild variant="outline">
                <Link href={`/${locale}/catalog`}>{t.resetFilters}</Link>
              </Button>
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
