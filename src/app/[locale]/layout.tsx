import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isLocale } from "@/lib/domain";
import { getAccount } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { user } = await getAccount();
  return (
    <>
      <a href="#main" className="skip-link">
        {locale === "ar" ? "انتقل للمحتوى" : "Skip to content"}
      </a>
      <Suspense>
        <SiteHeader locale={locale} signedIn={!!user} />
      </Suspense>
      {process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "preview" && (
        <div className="preview-notice">
          {locale === "ar"
            ? "نسخة تجريبية — الحسابات والطلبات للاختبار فقط."
            : "Development preview — accounts and orders are for testing only."}
        </div>
      )}
      <main id="main">{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
