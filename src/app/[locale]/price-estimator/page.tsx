import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
export const metadata = { title: "Hardware price estimator" };
export default async function Estimator({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale);
  return (
    <div className="container">
      <section className="feature-page">
        <ChartNoAxesCombined />
        <div className="eyebrow">{t.comingSoon}</div>
        <h1>{t.pricingTitle}</h1>
        <p>{t.pricingText}</p>
        <div className="notice" style={{ marginTop: 30 }}>
          {t.noEstimate}
        </div>
      </section>
    </div>
  );
}
