import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { getAccount } from "@/lib/auth";
import { CartPage } from "@/components/cart-page";
export const metadata = { title: "Your cart", robots: { index: false, follow: false } };
export default async function Cart({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await getAccount();
  return <CartPage locale={locale} signedIn={!!account.user} configured={account.configured} />;
}
