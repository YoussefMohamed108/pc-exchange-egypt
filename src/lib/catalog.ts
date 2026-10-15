import "server-only";
import { createSupabaseClient } from "./supabase/server";
import type { Product, InventoryRow, InspectionReport, Order } from "./domain";
import type { CatalogFilters } from "./validation";
import { egpToPiastres } from "./money";
export const PAGE_SIZE = 12;
export async function getCatalog(filters: CatalogFilters) {
  const client = await createSupabaseClient();
  if (!client) return { products: [] as Product[], count: 0, state: "unconfigured" as const };
  let query = client.from("all_catalog_products").select("*", { count: "exact" });
  if (filters.q)
    query = query.textSearch("search_document", filters.q, { type: "websearch", config: "simple" });
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.brand) query = query.ilike("brand", filters.brand.replace(/[%_\\]/g, "\\$&"));
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.min) query = query.gte("price_piastres", egpToPiastres(filters.min));
  if (filters.max) query = query.lte("price_piastres", egpToPiastres(filters.max));
  if (filters.verified)
    query = query.or(
      "verification_status.eq.platform_verified,benchmark_status.eq.benchmark_reviewed",
    );
  if (filters.warranty) query = query.gt("warranty_months", 0);
  if (filters.available) query = query.gt("available_quantity", 0);
  if (filters.governorate) query = query.eq("governorate", filters.governorate);
  query =
    filters.sort === "newest"
      ? query.order("created_at", { ascending: false })
      : query.order("price_piastres", { ascending: filters.sort === "price-asc" });
  const { data, count, error } = await query
    .order("id")
    .range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1);
  if (error) {
    console.error("catalog.query_failed", { code: error.code });
    return { products: [] as Product[], count: 0, state: "error" as const };
  }
  return { products: data || [], count: count || 0, state: "ready" as const };
}
export async function getProduct(slug: string) {
  const client = await createSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("public_products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Product could not be loaded.");
  return data as Product | null;
}
export async function getProductsByIds(ids: string[]) {
  const client = await createSupabaseClient();
  if (!client || !ids.length) return [] as Product[];
  const { data, error } = await client
    .from("public_products")
    .select("*")
    .in("id", ids.slice(0, 30));
  if (error) throw new Error("Cart items could not be loaded.");
  return data || [];
}
export async function getInventory(): Promise<InventoryRow[]> {
  const client = await createSupabaseClient();
  if (!client) return [];
  const inventory = await client
    .from("inventory_items")
    .select(
      "product_id,sku,purchase_cost_piastres,stock_on_hand,reserved_quantity,storage_location",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (inventory.error) throw new Error("Inventory could not be loaded.");
  if (!inventory.data.length) return [];
  const products = await client
    .from("products")
    .select("id,title,price_piastres,status,condition,category_slug,updated_at")
    .in(
      "id",
      inventory.data.map((i) => i.product_id),
    );
  if (inventory.error || products.error) throw new Error("Inventory could not be loaded.");
  const map = new Map(products.data?.map((p) => [p.id, p]));
  return (inventory.data || []).flatMap((i) => {
    const p = map.get(i.product_id);
    return p ? [{ ...i, products: p }] : [];
  });
}
export async function getOrders(): Promise<Order[]> {
  const client = await createSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("orders")
    .select(
      "id,user_id,status,payment_method,payment_status,total_piastres,phone,payment_reference,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Orders could not be loaded.");
  return data || [];
}
export async function getReport(id: string): Promise<InspectionReport | null> {
  const client = await createSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("public_inspection_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Inspection report could not be loaded.");
  return data;
}
export async function getOrderItems(orderIds: string[]) {
  const client = await createSupabaseClient();
  if (!client || !orderIds.length) return [];
  const { data, error } = await client
    .from("customer_order_items")
    .select("*")
    .in("order_id", orderIds.slice(0, 100));
  if (error) throw new Error("Order items could not be loaded.");
  return data || [];
}
export function productImage(path: string) {
  if (!/^products\/[a-f0-9-]+\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(path)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/product-images/${path}` : null;
}
