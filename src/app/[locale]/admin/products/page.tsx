import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeletedFileCleanup } from "@/components/permanent-delete-form";
type Row = {
  id: string;
  reference_code: string;
  title: string;
  source: "seller" | "company";
  status: string;
  paused: boolean;
  deleted_at: string | null;
  price_piastres: number;
  inspection_pending: boolean;
};
export default async function Products({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireStaff(locale);
  const q = await searchParams;
  const scalar = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : "");
  const term = scalar("q").slice(0, 150),
    kind = ["seller", "company"].includes(scalar("source")) ? scalar("source") : "all",
    states = ["all", "listed", "draft", "sold", "archived", "paused", "deleted", "inspection"],
    state = states.includes(scalar("state")) ? scalar("state") : "all",
    page = Math.min(10000, Math.max(1, parseInt(scalar("page")) || 1));
  const client = await createSupabaseClient();
  const [result, cleanup] = await Promise.all([
    client?.rpc("admin_find_products", { term, kind, state, page_number: page }),
    client?.rpc("admin_pending_file_cleanup"),
  ]);
  if (result?.error) throw new Error("Product management could not be loaded.");
  const data = (result?.data || { items: [], total: 0 }) as { items: Row[]; total: number };
  const ar = locale === "ar";
  if (cleanup?.error) throw new Error("File cleanup status could not be loaded.");
  const pageUrl = (n: number) =>
    `/${locale}/admin/products?${new URLSearchParams({ q: term, source: kind, state, page: String(n) })}`;
  const labels: Record<string, string> = ar
    ? {
        all: "الكل",
        listed: "منشور",
        draft: "مسودة",
        sold: "مباع",
        archived: "مؤرشف",
        paused: "موقوف",
        deleted: "محذوف",
        inspection: "طلبات الفحص",
      }
    : {
        all: "All states",
        listed: "Listed",
        draft: "Draft",
        sold: "Sold",
        archived: "Archived",
        paused: "Paused",
        deleted: "Deleted",
        inspection: "Inspection requests",
      };
  return (
    <>
      {scalar("notice") === "permanently_deleted" && (
        <p className="notice" role="status">
          {ar ? "تم حذف المنتج نهائيًا." : "Product permanently deleted."}
        </p>
      )}
      {!!cleanup?.data.length && <DeletedFileCleanup locale={locale} />}
      <div className="admin-heading">
        <div>
          <div className="eyebrow">PCX / OPERATIONS</div>
          <h1>{ar ? "كل المنتجات." : "All products."}</h1>
          <p>
            {ar
              ? "ابحث بمعرف PCX أو UUID أو الاسم أو الموديل أو SKU."
              : "Find any product by PCX reference, UUID, title, model or SKU."}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/inventory/new`}>
            {ar ? "إضافة مخزون" : "Add company stock"}
          </Link>
        </Button>
      </div>
      <form className="admin-product-search">
        <div className="field">
          <label htmlFor="product-search">{ar ? "البحث عن منتج" : "Find a product"}</label>
          <Input
            id="product-search"
            name="q"
            defaultValue={term}
            placeholder="PCX-100001"
            maxLength={150}
          />
        </div>
        <div className="field">
          <label htmlFor="product-source">{ar ? "المصدر" : "Source"}</label>
          <Select id="product-source" name="source" defaultValue={kind}>
            <option value="all">{ar ? "كل المصادر" : "All sources"}</option>
            <option value="seller">{ar ? "البائعون" : "Seller listings"}</option>
            <option value="company">{ar ? "مخزون الشركة" : "Company stock"}</option>
          </Select>
        </div>
        <div className="field">
          <label htmlFor="product-state">{ar ? "الحالة" : "State"}</label>
          <Select id="product-state" name="state" defaultValue={state}>
            {states.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </Select>
        </div>
        <Button>{ar ? "بحث" : "Search"}</Button>
      </form>
      <p>
        {data.total} {ar ? "منتج مطابق" : "matching products"} · {ar ? "صفحة" : "Page"} {page}
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{ar ? "معرف المنتج" : "Product ID"}</th>
              <th>{ar ? "المنتج" : "Product"}</th>
              <th>{ar ? "المصدر" : "Source"}</th>
              <th>{ar ? "الحالة" : "State"}</th>
              <th>{ar ? "السعر" : "Price"}</th>
              <th>{ar ? "الإدارة" : "Manage"}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={`${p.source}-${p.id}`}>
                <td>
                  <code>{p.reference_code}</code>
                </td>
                <td>
                  {p.title}
                  {p.inspection_pending && (
                    <p className="field-hint">{ar ? "طلب فحص نشط" : "Active inspection request"}</p>
                  )}
                </td>
                <td>
                  {p.source === "seller" ? (ar ? "بائع" : "Seller") : ar ? "الشركة" : "Company"}
                </td>
                <td>{labels[p.deleted_at ? "deleted" : p.paused ? "paused" : p.status]}</td>
                <td>{formatMoney(p.price_piastres, locale)}</td>
                <td>
                  <Link href={`/${locale}/admin/products/${p.source}/${p.id}`}>
                    {ar ? "إدارة" : "Manage"} ↗
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.items.length && (
        <p className="notice">
          {ar
            ? "لا توجد منتجات مطابقة. جرّب البحث بمعرف المنتج أو تغيير الفلاتر."
            : "No matching products. Try a product reference or change the filters."}
        </p>
      )}
      <nav className="pagination" aria-label={ar ? "صفحات المنتجات" : "Product pages"}>
        {page > 1 && <Link href={pageUrl(page - 1)}>{ar ? "السابق" : "Previous"}</Link>}
        {page * 25 < data.total && <Link href={pageUrl(page + 1)}>{ar ? "التالي" : "Next"}</Link>}
      </nav>
    </>
  );
}
