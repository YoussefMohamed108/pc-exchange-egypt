import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { getOrders, getOrderItems } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { OrderActions } from "@/components/order-actions";
import { EmptyState } from "@/components/ui/empty-state";
export default async function Orders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireStaff(locale);
  const t = dictionary(locale),
    orders = await getOrders();
  const items = await getOrderItems(orders.map((o) => o.id));
  return (
    <>
      <div className="admin-heading">
        <h1>{t.orderQueue}</h1>
      </div>
      {orders.length ? (
        <div className="order-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-card-top">
                <h3>
                  #{o.id.slice(0, 8).toUpperCase()} · {o.phone}
                </h3>
                <strong>{formatMoney(o.total_piastres, locale)}</strong>
              </div>
              <p>
                {o.payment_method} · {t.pickup} ·{" "}
                {new Date(o.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-EG")}
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
              {o.payment_reference && (
                <p style={{ marginTop: 12 }}>
                  {t.paymentReference}: {o.payment_reference}
                </p>
              )}
              <OrderActions order={o} locale={locale} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={t.noAdminOrders} />
      )}
    </>
  );
}
