import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, canManageInventory, canInspect } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getOrders, getOrderItems } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { signOut } from "@/app/actions/auth";
import { submitReference } from "@/app/actions/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
export const metadata = { title: "Your account", robots: { index: false, follow: false } };
export default async function Account({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await requireUser(locale),
    t = dictionary(locale),
    orders = (await getOrders()).filter((o) => o.user_id === account.user!.id),
    q = await searchParams;
  const items = await getOrderItems(orders.map((o) => o.id));
  return (
    <div className="container content-section">
      <div className="account-top">
        <div>
          <h1>{account.name || t.account}</h1>
          <p>{account.user?.email}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canManageInventory(account.roles) && (
            <Button asChild variant="outline">
              <Link href={`/${locale}/admin`}>{t.admin}</Link>
            </Button>
          )}
          {canInspect(account.roles) && (
            <Button asChild variant="outline">
              <Link href={`/${locale}/admin/inspections`}>{t.inspectionReports}</Link>
            </Button>
          )}
          <form action={signOut.bind(null, locale)}>
            <Button variant="ghost" type="submit">
              {t.signOut}
            </Button>
          </form>
        </div>
      </div>
      {q.notice === "forbidden" && <div className="notice error">{t.forbidden}</div>}
      <div className="account-marketplace">
        <div>
          <div className="eyebrow">
            {locale === "ar" ? "حساب واحد. شراء وبيع." : "ONE ACCOUNT. BUY AND SELL."}
          </div>
          <h2>{locale === "ar" ? "اعرض مكوناتك للبيع." : "Pass your hardware on."}</h2>
          <p>
            {locale === "ar"
              ? "انشر إعلانك مباشرة، وأرسل الاختبارات اختياريًا لمراجعة الأدمن."
              : "Publish a listing immediately, then optionally submit benchmarks for admin review."}
          </p>
        </div>
        <div className="market-actions">
          <Button asChild>
            <Link href={`/${locale}/account/listings`}>
              {locale === "ar" ? "إعلاناتي" : "My listings"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/account/setup`}>
              {locale === "ar" ? "بيانات التواصل" : "Contact details"}
            </Link>
          </Button>
        </div>
      </div>
      <div className="section-heading">
        <h2>{t.orders}</h2>
      </div>
      {orders.length ? (
        <div className="order-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-card-top">
                <h3>#{o.id.slice(0, 8).toUpperCase()}</h3>
                <strong>{formatMoney(o.total_piastres, locale)}</strong>
              </div>
              <p>
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG").format(
                  new Date(o.created_at),
                )}{" "}
                · {t.pickup}
              </p>
              <ul className="order-item-list">
                {items
                  .filter((i) => i.order_id === o.id)
                  .map((i) => (
                    <li key={i.id}>
                      <span>
                        {i.quantity} × {i.title}
                      </span>
                      <span>{formatMoney(i.unit_price_piastres * i.quantity, locale)}</span>
                    </li>
                  ))}
              </ul>
              <div style={{ marginTop: 12 }}>
                <span className="badge">{o.status}</span>
                <span className="badge">
                  {t.paymentState}: {o.payment_status}
                </span>
              </div>
              {o.payment_method !== "cash_on_pickup" &&
                o.payment_status !== "verified" &&
                !["completed", "cancelled"].includes(o.status) && (
                  <form action={submitReference.bind(null, locale, o.id)}>
                    <Input
                      name="reference"
                      aria-label={t.paymentReference}
                      placeholder={t.paymentReference}
                      required
                      minLength={3}
                      maxLength={200}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {t.submitReference}
                    </Button>
                  </form>
                )}
              {o.payment_status === "submitted" && (
                <p style={{ marginTop: 12 }}>{t.referenceSubmitted}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={t.noOrders} description={t.noOrdersText}>
          <Button asChild>
            <Link href={`/${locale}/catalog`}>{t.continueShopping}</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
