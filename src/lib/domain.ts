export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: string): value is Locale => locales.includes(value as Locale);
export const roles = ["user", "admin"] as const;
export type Role = (typeof roles)[number];
export const canManageInventory = (values: Role[]) => values.includes("admin");
export const canInspect = canManageInventory;
export const categorySlugs = [
  "graphics-cards",
  "processors",
  "motherboards",
  "memory",
  "storage",
  "power-supplies",
  "cases",
  "cooling",
  "monitors",
  "peripherals",
  "pc-builds",
  "laptops",
  "other",
] as const;
export type CategorySlug = (typeof categorySlugs)[number];
export type Condition = "A" | "B" | "C" | "D";
export type VerificationStatus =
  "not_inspected" | "platform_verified" | "verification_expired" | "verification_failed";
export type Product = {
  source?: "company" | "seller";
  benchmark_status?: "not_reviewed" | "benchmark_reviewed";
  id: string;
  reference_code?: string;
  slug: string;
  title: string;
  title_ar: string | null;
  category_slug: CategorySlug;
  brand: string;
  model: string;
  description: string;
  description_ar: string | null;
  condition: Condition;
  price_piastres: number;
  warranty_months: number;
  governorate: string;
  specifications: Record<string, string | number | boolean>;
  image_paths: string[];
  available_quantity: number;
  verification_status: VerificationStatus;
  inspection_id: string | null;
  created_at: string;
};
export type InventoryRow = {
  product_id: string;
  sku: string;
  purchase_cost_piastres: number;
  stock_on_hand: number;
  reserved_quantity: number;
  storage_location: string;
  products: {
    title: string;
    price_piastres: number;
    status: string;
    condition: Condition;
    category_slug: CategorySlug;
    updated_at: string;
  };
};
export type InspectionReport = {
  id: string;
  product_id: string;
  condition: Condition;
  scope: string;
  findings: string;
  known_defects: string;
  tests: Record<string, string | number | boolean>;
  outcome: "passed" | "failed";
  inspected_at: string;
  expires_at: string;
  product_title: string;
  product_brand: string;
  product_model: string;
  inspector_reference: string;
  current_revision: boolean;
  revoked_at?: string | null;
  revoked_reason?: string | null;
};
export type Order = {
  id: string;
  user_id: string;
  status: "pending" | "confirmed" | "ready" | "completed" | "cancelled";
  payment_method: "cash_on_pickup" | "bank_transfer" | "instapay" | "mobile_wallet";
  payment_status: "pending" | "submitted" | "verified";
  total_piastres: number;
  phone: string;
  payment_reference: string | null;
  created_at: string;
};
export type CartItem = { product_id: string; quantity: number };
