import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCw } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Trade-in" };
export default async function TradeIn({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale);
  return (
    <div className="container">
      <section className="feature-page">
        <RotateCw />
        <div className="eyebrow">{t.comingSoon}</div>
        <h1>{t.tradeTitle}</h1>
        <p>{t.tradeText}</p>
        <Button asChild variant="outline">
          <Link href={`/${locale}/catalog`}>{t.continueShopping}</Link>
        </Button>
      </section>
    </div>
  );
}
