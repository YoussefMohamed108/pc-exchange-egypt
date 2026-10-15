import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { getAccount } from "@/lib/auth";
import { getSellerListing, getBenchmarks, marketplaceImage } from "@/lib/marketplace";
import { createSupabaseClient } from "@/lib/supabase/server";
import { categoryName, dictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { BenchmarkHistory } from "@/components/benchmark-history";
import { specificationLabel } from "@/lib/hardware-specifications";
export const metadata = { title: "Seller listing" };
export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const l = await getSellerListing(id);
  if (!l || l.status !== "listed" || l.hidden || l.deleted_at) notFound();
  const a = await getAccount();
  const ar = locale === "ar",
    t = dictionary(locale);
  const client = await createSupabaseClient();
  const badge = await client!
    .from("all_catalog_products")
    .select("benchmark_status,verification_status,inspection_id")
    .eq("id", id)
    .maybeSingle();
  if (badge.error) throw new Error("Review status could not be loaded.");
  const reviewed = badge.data?.benchmark_status === "benchmark_reviewed";
  const inspected = badge.data?.verification_status === "platform_verified";
  const benchmarks = a.user ? await getBenchmarks(id) : [];
  return (
    <div className="container content-section">
      <Link href={`/${locale}/catalog?category=${l.category_slug}`}>
        {categoryName(l.category_slug, locale)}
      </Link>
      <div className="market-detail">
        <div className="listing-gallery">
          {l.image_paths.map((path, i) => {
            const src = marketplaceImage(path);
            return src ? (
              <Image
                src={src}
                key={path}
                alt={`${l.title} — ${i + 1}`}
                width={850}
                height={650}
                unoptimized
              />
            ) : null;
          })}
          {(reviewed || inspected) && (
            <span className="benchmark-watermark">
              <ShieldCheck size={18} />
              {inspected ? "PCX Inspected" : ar ? "تمت مراجعة الاختبارات" : "Benchmark reviewed"}
            </span>
          )}
        </div>
        <section>
          <div className="eyebrow">{ar ? "من بائع مستقل" : "FROM AN INDEPENDENT SELLER"}</div>
          <h1>{l.title}</h1>
          <p>
            <code>{l.reference_code}</code>
          </p>
          {badge.data?.inspection_id && (
            <p>
              <Link href={`/${locale}/inspections/${badge.data.inspection_id}`}>
                <ShieldCheck size={16} style={{ display: "inline" }} />{" "}
                {inspected
                  ? ar
                    ? "فحصه فريق PCX — عرض التقرير"
                    : "PCX Inspected — view report"
                  : ar
                    ? "عرض تقرير الفحص السابق"
                    : "View inspection report"}{" "}
                ↗
              </Link>
            </p>
          )}
          <p className="listing-price">{formatMoney(l.price_piastres, locale)}</p>
          <p>
            {l.governorate} · {t[`grade${l.condition}`]}
          </p>
          <p className="preserve-lines">{l.description}</p>
          <div className="notice">
            <strong>{ar ? "العيوب المعروفة" : "Known defects"}</strong>
            <p>{l.known_defects}</p>
          </div>
          <Button asChild>
            <Link href={`/${locale}/listings/${id}/contact`}>
              {ar ? "شراء / تواصل مع البائع" : "Buy / Contact seller"}
            </Link>
          </Button>
          <p className="field-hint">
            {ar
              ? "اتفق على الدفع والتسليم مباشرة مع البائع. عرض بيانات التواصل لا يحجز المنتج."
              : "Arrange payment and delivery directly with the seller. Viewing contact details does not reserve the product."}
          </p>
          {a.user?.id === l.seller_id && (
            <Link href={`/${locale}/account/listings/${id}`}>
              {ar ? "تعديل إعلاني" : "Edit my listing"}
            </Link>
          )}
        </section>
      </div>
      <section className="evidence-section">
        <h2>{ar ? "المواصفات" : "Specifications"}</h2>
        <p className="field-hint">
          {ar ? "المواصفات حسب وصف البائع." : "Specifications are seller-reported."}
        </p>
        <dl className="spec-table">
          {Object.entries(l.specifications).map(([k, v]) => (
            <div key={k}>
              <dt>{specificationLabel(k, locale)}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="evidence-section">
        <div className="eyebrow">{ar ? "شفافية قبل الشراء" : "LOOK BEFORE YOU BUY"}</div>
        <h2>{ar ? "أدلة الاختبارات." : "Benchmark evidence."}</h2>
        <p>
          {reviewed
            ? ar
              ? "راجع أدمن أدلة هذه المكونات. هذا ليس فحصًا فعليًا أو ضمانًا."
              : "An admin reviewed evidence for this hardware. This is not a physical inspection or warranty."
            : ar
              ? "هذا الإعلان لا يحمل علامة تمت مراجعة الاختبارات."
              : "This listing does not carry the Benchmark reviewed watermark."}
        </p>
        {a.user ? (
          benchmarks.length ? (
            <BenchmarkHistory locale={locale} items={benchmarks} revision={l.revision} />
          ) : (
            <p>
              {ar
                ? "لم يرسل البائع أدلة لهذه المكونات بعد."
                : "The seller has not submitted evidence for this hardware yet."}
            </p>
          )
        ) : (
          <Button asChild variant="outline">
            <Link
              href={`/${locale}/auth?mode=login&next=${encodeURIComponent(`/${locale}/listings/${id}`)}`}
            >
              {ar ? "سجّل دخولك لعرض الأدلة" : "Sign in to view evidence"}
            </Link>
          </Button>
        )}
      </section>
    </div>
  );
}
