import { notFound } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase/server";
import { dictionary } from "@/lib/i18n";
import { priceInput } from "@/lib/money";
import type { InventoryInput } from "@/lib/validation";
import { InventoryForm } from "@/components/inventory-form";
export default async function EditInventory({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(id).success) notFound();
  await requireStaff(locale);
  const client = await createSupabaseClient();
  if (!client) notFound();
  const [product, inventory] = await Promise.all([
    client.from("products").select("*").eq("id", id).maybeSingle(),
    client.from("inventory_items").select("*").eq("product_id", id).maybeSingle(),
  ]);
  if (product.error || inventory.error) throw new Error("Inventory could not be loaded.");
  if (!product.data || !inventory.data) notFound();
  const p = product.data,
    i = inventory.data;
  const initial: InventoryInput = {
    id: p.id,
    expected_updated_at: p.updated_at,
    title: p.title,
    title_ar: p.title_ar || "",
    category_slug: p.category_slug,
    brand: p.brand,
    model: p.model,
    description: p.description,
    description_ar: p.description_ar || "",
    condition: p.condition,
    price: priceInput(p.price_piastres),
    purchase_cost: priceInput(i.purchase_cost_piastres),
    sku: i.sku,
    quantity: i.stock_on_hand,
    warranty_months: p.warranty_months,
    governorate: p.governorate,
    status: p.status as "draft" | "listed" | "archived",
    specifications: JSON.stringify(p.specifications, null, 2),
    image_paths: p.image_paths.join("\n"),
  };
  return (
    <>
      <div className="admin-heading">
        <h1>{dictionary(locale).editProduct}</h1>
      </div>
      <InventoryForm locale={locale} initial={initial} />
    </>
  );
}
