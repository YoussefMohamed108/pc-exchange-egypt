import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { getSellerListing } from "@/lib/marketplace";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact seller", robots: { index: false, follow: false } };
export default async function Contact({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser(locale, `/${locale}/listings/${id}/contact`);
  const l = await getSellerListing(id);
  if (!l || l.status !== "listed" || l.hidden) notFound();
  const client = await createSupabaseClient();
  const { data, error } = await client!.rpc("seller_contact", { lid: id });
  const ar = locale === "ar";
  if (error || !data?.[0])
    return (
      <div className="container content-section">
        <h1>{ar ? "تعذر عرض بيانات التواصل." : "Contact details unavailable."}</h1>
        <p>
          {ar
            ? "قد يكون الإعلان غير متاح أو تم الوصول لحد عرض البيانات. حاول لاحقًا."
            : "The listing may be unavailable, or the contact-view limit was reached. Try again later."}
        </p>
      </div>
    );
  const c = data[0];
  const phone = c.phone.startsWith("0") ? `+20${c.phone.slice(1)}` : c.phone;
  return (
    <div className="container content-section market-page">
      <Link href={`/${locale}/listings/${id}`}>{l.title}</Link>
      <div className="contact-sheet">
        <div className="eyebrow">{ar ? "تواصل مباشر" : "LET’S TALK HARDWARE"}</div>
        <h1>{c.display_name}</h1>
        <p>{c.governorate}</p>
        {phone && (
          <>
            <p className="contact-phone" dir="ltr">
              {c.phone}
            </p>
            <div className="market-actions">
              <Button asChild>
                <a href={`tel:${phone}`}>{ar ? "اتصال" : "Call seller"}</a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/${phone.replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp ↗
                </a>
              </Button>
            </div>
          </>
        )}
        {c.social_url && (
          <p>
            <a href={c.social_url} target="_blank" rel="noopener noreferrer">
              {ar ? "رابط تواصل البائع" : "Seller’s social contact"} ↗
            </a>
          </p>
        )}
        <p>
          {ar
            ? "اتفق على السعر والتسليم مع البائع، وافحص المنتج قبل الدفع. لم يتم إنشاء طلب أو حجز هنا."
            : "Agree on price and delivery with the seller, and inspect the product before payment. No order or reservation has been created here."}
        </p>
      </div>
    </div>
  );
}
