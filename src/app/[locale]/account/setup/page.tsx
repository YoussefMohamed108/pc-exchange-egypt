import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { getContactProfile } from "@/lib/marketplace";
import { ContactForm } from "@/components/contact-form";
export const metadata = { title: "Contact setup", robots: { index: false, follow: false } };
export default async function Setup({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const a = await requireUser(locale, `/${locale}/account/setup`);
  return (
    <div className="container content-section market-page">
      <div className="eyebrow">
        {locale === "ar" ? "حساب واحد للشراء والبيع" : "ONE ACCOUNT. BUY AND SELL."}
      </div>
      <h1>{locale === "ar" ? "بيانات التواصل." : "How buyers reach you."}</h1>
      <ContactForm locale={locale} profile={await getContactProfile(a.user!.id)} name={a.name} />
    </div>
  );
}
