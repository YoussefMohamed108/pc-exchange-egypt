import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { getInventory, getOrders } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
export default async function Admin({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireStaff(locale);
  const t = dictionary(locale),
    [inventory, orders] = await Promise.all([getInventory(), getOrders()]);
  const metrics = [
    {
      label: t.inventoryValue,
      value: formatMoney(
        inventory.reduce((s, i) => s + i.stock_on_hand * i.purchase_cost_piastres, 0),
        locale,
      ),
    },
    {
      label: t.activeListings,
      value: inventory.filter((i) => i.products.status === "listed").length,
    },
    { label: t.reservedUnits, value: inventory.reduce((s, i) => s + i.reserved_quantity, 0) },
    {
      label: t.openOrders,
      value: orders.filter((o) => o.status !== "cancelled" && o.status !== "completed").length,
    },
  ];
  return (
    <>
      <div className="admin-heading">
        <h1>{t.inventory}</h1>
        <Button asChild>
          <Link href={`/${locale}/admin/inventory/new`}>
            <Plus size={15} />
            {t.addProduct}
          </Link>
        </Button>
      </div>
      <div className="stat-grid">
        {metrics.map((m) => (
          <div className="stat-card" key={m.label}>
            <p>{m.label}</p>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      {inventory.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.product}</th>
                <th>{t.sku}</th>
                <th>{t.stock}</th>
                <th>{t.reserved}</th>
                <th>{t.status}</th>
                <th>{t.price}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => (
                <tr key={i.product_id}>
                  <td>
                    {i.products.title}
                    <small>
                      {t.grade} {i.products.condition}
                    </small>
                  </td>
                  <td>{i.sku}</td>
                  <td>{i.stock_on_hand}</td>
                  <td>{i.reserved_quantity}</td>
                  <td>{i.products.status}</td>
                  <td>{formatMoney(i.products.price_piastres, locale)}</td>
                  <td>
                    <Link
                      className="section-link"
                      href={`/${locale}/admin/inventory/${i.product_id}`}
                    >
                      {t.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t.inventoryEmpty} description={t.inventoryEmptyText}>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/inventory/new`}>{t.addProduct}</Link>
          </Button>
        </EmptyState>
      )}
      <p className="field-hint" style={{ marginTop: 18 }}>
        {locale === "ar"
          ? "يعرض الجدول أحدث 100 عنصر. المقاييس تخص العناصر المعروضة."
          : "The table shows the latest 100 inventory items and orders. Metrics describe these loaded records."}
      </p>
    </>
  );
}
