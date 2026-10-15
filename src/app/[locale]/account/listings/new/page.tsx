import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { getContactProfile } from "@/lib/marketplace";
import { ListingForm } from "@/components/listing-form";
export const metadata = { title: "Sell hardware", robots: { index: false, follow: false } };
export default async function NewListing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const a = await requireUser(locale, `/${locale}/account/listings/new`);
  const profile = await getContactProfile(a.user!.id);
  if (!profile) redirect(`/${locale}/account/setup`);
  return (
    <div className="container content-section market-page">
      <div className="eyebrow">
        {locale === "ar" ? "فصل جديد لمكوناتك" : "A NEXT CHAPTER FOR YOUR HARDWARE"}
      </div>
      <h1>{locale === "ar" ? "اعرض للبيع." : "Make room for what’s next."}</h1>
      <ListingForm locale={locale} governorate={profile.governorate} />
    </div>
  );
}
