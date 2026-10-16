import { publicPageMetadata } from "@/lib/site-metadata";
import Image from "next/image";
import Link from "next/link";
import { specificationLabel } from "@/lib/hardware-specifications";
import { notFound } from "next/navigation";
import { ShieldCheck, ChevronRight, MapPin } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary, categoryName } from "@/lib/i18n";
import { getProduct, productImage } from "@/lib/catalog";
import { formatMoney, priceInput } from "@/lib/money";
import { siteUrl } from "@/lib/env";
import { categoryIcons } from "@/components/categories";
import { AddToCart } from "@/components/add-to-cart";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug, locale } = await params;
  if (!isLocale(locale)) notFound();
  const p = await getProduct(slug);
  return p
    ? {
        title: locale === "ar" && p.title_ar ? p.title_ar : p.title,
        description: p.description.slice(0, 160),
        ...publicPageMetadata(
          locale,
          `/products/${encodeURIComponent(slug)}`,
          locale === "ar" && p.title_ar ? p.title_ar : p.title,
        ),
      }
    : { title: "Hardware unavailable", robots: { index: false, follow: false } };
}
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const p = await getProduct(slug);
  if (!p) notFound();
  const t = dictionary(locale),
    Icon = categoryIcons[p.category_slug],
    images = p.image_paths.map(productImage).filter((v): v is string => !!v),
    title = locale === "ar" && p.title_ar ? p.title_ar : p.title;
  const status =
    p.verification_status === "platform_verified"
      ? t.verified
      : p.verification_status === "verification_expired"
        ? t.expired
        : p.verification_status === "verification_failed"
          ? t.failed
          : t.notInspected;
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: p.description,
    brand: { "@type": "Brand", name: p.brand },
    sku: p.slug,
    ...(images.length ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: priceInput(p.price_piastres),
      availability:
        p.available_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition:
        p.condition === "D"
          ? "https://schema.org/DamagedCondition"
          : "https://schema.org/UsedCondition",
      url: `${siteUrl()}/${locale}/products/${slug}`,
    },
  };
  return (
    <div className="container content-section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      <nav className="breadcrumb">
        <Link href={`/${locale}/catalog`}>{t.allHardware}</Link>
        <ChevronRight size={11} />
        <Link href={`/${locale}/catalog?category=${p.category_slug}`}>
          {categoryName(p.category_slug, locale)}
        </Link>
      </nav>
      <section className="detail-layout">
        <div>
          <div className="detail-image">
            {images[0] ? (
              <Image src={images[0]} alt={title} width={650} height={480} unoptimized />
            ) : (
              <Icon />
            )}
          </div>
          {images.length > 1 && (
            <div className="detail-gallery">
              {images.slice(1).map((url, i) => (
                <a href={url} key={url} target="_blank" rel="noreferrer">
                  <Image src={url} alt={`${title} ${i + 2}`} width={120} height={90} unoptimized />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <div className="eyebrow">
            {p.brand} / {p.model}
          </div>
          <h1>{title}</h1>
          <p className="product-reference">{p.reference_code}</p>
          <div className="badges">
            <span
              className={`badge ${p.verification_status === "platform_verified" ? "success" : ""}`}
            >
              <ShieldCheck size={13} />
              {status}
            </span>
            <span className="badge">
              {t.grade} {p.condition} · {t[`grade${p.condition}`]}
            </span>
          </div>
          <div className="product-price">{formatMoney(p.price_piastres, locale)}</div>
          <div className="detail-subinfo">
            <span>
              <MapPin size={12} style={{ display: "inline" }} /> {p.governorate}
            </span>
            <span>{p.available_quantity > 0 ? t.inStock : t.outOfStock}</span>
          </div>
          <p className="detail-description">
            {locale === "ar" && p.description_ar ? p.description_ar : p.description}
          </p>
          <AddToCart id={p.id} locale={locale} available={p.available_quantity > 0} />
          <div className="detail-subinfo">
            {t.company} · {p.warranty_months ? `${p.warranty_months} ${t.warranty}` : t.noWarranty}
          </div>
        </div>
      </section>
      <section className="detail-panels">
        <div className="panel">
          <h2>{t.details}</h2>
          <dl className="spec-list">
            {Object.entries(p.specifications).map(([key, value]) => (
              <div style={{ display: "contents" }} key={key}>
                <dt>{specificationLabel(key, locale).replaceAll("_", " ")}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          <p style={{ marginTop: 20 }}>{t.sellerProvided}</p>
        </div>
        <div className="panel-stack">
          <div className="panel">
            <h2>{t.inspection}</h2>
            {p.inspection_id ? (
              <Link className="section-link" href={`/${locale}/reports/${p.inspection_id}`}>
                {t.viewReport} →
              </Link>
            ) : (
              <p>{t.reportUnavailable}</p>
            )}
          </div>
          <div className="panel">
            <h2>{t.pickup}</h2>
            <p>{t.pickupText}</p>
          </div>
          <div className="panel">
            <h2>{t.returns}</h2>
            <p>{t.returnsText}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
