import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MapPin } from "lucide-react";
import type { Product, Locale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { productImage } from "@/lib/catalog";
import { marketplaceImage } from "@/lib/marketplace";
import { categoryIcons } from "./categories";
export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = dictionary(locale),
    Icon = categoryIcons[product.category_slug],
    image = product.image_paths[0]
      ? product.source === "seller"
        ? marketplaceImage(product.image_paths[0])
        : productImage(product.image_paths[0])
      : null;
  const title = locale === "ar" && product.title_ar ? product.title_ar : product.title;
  return (
    <article className="product-card">
      <Link
        href={
          product.source === "seller"
            ? `/${locale}/listings/${product.id}`
            : `/${locale}/products/${product.slug}`
        }
      >
        <div className="product-photo">
          {image ? (
            <Image src={image} alt={title} width={360} height={240} unoptimized />
          ) : (
            <Icon aria-hidden="true" />
          )}
          {(product.verification_status === "platform_verified" ||
            product.benchmark_status === "benchmark_reviewed") && (
            <span className="verified-badge">
              <ShieldCheck size={10} />
              {product.source === "seller" && product.verification_status === "platform_verified"
                ? "PCX Inspected"
                : product.benchmark_status === "benchmark_reviewed"
                  ? locale === "ar"
                    ? "تمت مراجعة الاختبارات"
                    : "Benchmark reviewed"
                  : t.verified}
            </span>
          )}
        </div>
        <div className="product-card-body">
          <div className="product-meta">
            {product.brand} · {t.grade} {product.condition} · {t[`grade${product.condition}`]}
          </div>
          <h3>{title}</h3>
          {product.reference_code && (
            <div className="product-reference">{product.reference_code}</div>
          )}
          <div className="product-price">{formatMoney(product.price_piastres, locale)}</div>
          <div className="product-card-foot">
            <span>
              <MapPin size={10} style={{ display: "inline", marginInlineEnd: 3 }} />
              {product.governorate}
            </span>
            <span>{product.available_quantity > 0 ? t.inStock : t.outOfStock}</span>
          </div>
          <div className="product-card-foot">
            <span>
              {product.source === "seller"
                ? locale === "ar"
                  ? "إعلان بائع"
                  : "Seller listing"
                : t.company}
            </span>
            <span>
              {product.warranty_months > 0
                ? `${product.warranty_months} ${t.warranty}`
                : t.noWarranty}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
