import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Package, ShoppingBag, ScanLine, ArrowLeft } from "lucide-react";
import { isLocale, canManageInventory, canInspect } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
export const metadata = { title: "Operations", robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await requireUser(locale),
    t = dictionary(locale);
  if (!canManageInventory(account.roles) && !canInspect(account.roles))
    redirect(`/${locale}/account?notice=forbidden`);
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <div className="eyebrow">{t.operations}</div>
        {canManageInventory(account.roles) && (
          <>
            <Link href={`/${locale}/admin/products`}>
              <Package size={16} />
              {locale === "ar" ? "إدارة كل المنتجات" : "All products"}
            </Link>
            <Link href={`/${locale}/admin`}>
              <Package size={16} />
              {t.inventory}
            </Link>
            <Link href={`/${locale}/admin/orders`}>
              <ShoppingBag size={16} />
              {t.orderQueue}
            </Link>
            <Link href={`/${locale}/admin/listings`}>
              <ScanLine size={16} />
              {locale === "ar" ? "مراجعة الإعلانات" : "Listing reviews"}
            </Link>
            <Link href={`/${locale}/admin/benchmarks`}>
              <ScanLine size={16} />
              {locale === "ar" ? "مراجعة الاختبارات" : "Benchmark reviews"}
            </Link>
          </>
        )}
        {canInspect(account.roles) && (
          <Link href={`/${locale}/admin/inspections`}>
            <ScanLine size={16} />
            {t.inspectionReports}
          </Link>
        )}
        <Link className="admin-back" href={`/${locale}/account`}>
          <ArrowLeft size={13} />
          {t.account}
        </Link>
      </aside>
      <section>{children}</section>
    </div>
  );
}
