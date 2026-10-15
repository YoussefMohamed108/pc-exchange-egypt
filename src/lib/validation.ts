import { z } from "zod";
import { categorySlugs, type Locale } from "./domain";
import { egpToPiastres } from "./money";

const money = z
  .string()
  .trim()
  .refine((v) => {
    try {
      egpToPiastres(v);
      return true;
    } catch {
      return false;
    }
  }, "Use a valid EGP amount with at most 2 decimal places.");
export const catalogFiltersSchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    category: z.enum(categorySlugs).optional(),
    brand: z.string().trim().max(60).default(""),
    condition: z.enum(["A", "B", "C", "D"]).optional(),
    min: money.optional(),
    max: money.optional(),
    verified: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    warranty: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    available: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    governorate: z.string().trim().max(60).default(""),
    sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .refine((v) => !v.min || !v.max || egpToPiastres(v.min) <= egpToPiastres(v.max), {
    message: "Minimum price must not exceed maximum price.",
    path: ["min"],
  });
export type CatalogFilters = z.output<typeof catalogFiltersSchema>;
export const specificationsSchema = z
  .record(
    z.string().min(1).max(60),
    z.union([z.string().max(500), z.number().finite(), z.boolean()]),
  )
  .refine((v) => Object.keys(v).length <= 40, "Use up to 40 specification fields.");
const specsJson = z
  .string()
  .max(15000)
  .transform((v, ctx) => {
    try {
      return specificationsSchema.parse(JSON.parse(v));
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Specifications must be a JSON object of text, numbers or booleans.",
      });
      return z.NEVER;
    }
  });
const inspectedSpecsJson = specsJson.refine(
  (v) => Object.keys(v).length > 0,
  "Record at least one documented test.",
);
export const inventorySchema = z
  .object({
    id: z.uuid().optional(),
    expected_updated_at: z.iso.datetime({ offset: true }).optional(),
    title: z.string().trim().min(5).max(150),
    title_ar: z.string().trim().max(150),
    category_slug: z.enum(categorySlugs),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(100),
    description: z.string().trim().min(15).max(5000),
    description_ar: z.string().trim().max(5000),
    condition: z.enum(["A", "B", "C", "D"]),
    price: money.refine((v) => egpToPiastres(v) > 0, "Price must be greater than zero."),
    purchase_cost: money,
    sku: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes or underscores."),
    quantity: z.coerce.number<number>().int().min(0).max(1000),
    warranty_months: z.coerce.number<number>().int().min(0).max(60),
    governorate: z.string().trim().min(2).max(60),
    status: z.enum(["draft", "listed", "archived"]),
    specifications: specsJson,
    image_paths: z
      .string()
      .max(2000)
      .transform((v) =>
        v
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(
            z
              .string()
              .regex(
                /^products\/[a-f0-9-]+\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp)$/i,
                "Use a product-images storage path: products/UUID/filename.webp",
              ),
          )
          .max(8),
      ),
  })
  .strict()
  .refine((v) => !!v.id || v.quantity > 0, {
    path: ["quantity"],
    message: "New inventory must have at least one unit.",
  });
export type InventoryInput = z.input<typeof inventorySchema>;
export const authSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(10).max(128),
  full_name: z.string().trim().min(2).max(100).optional(),
});
export const checkoutSchema = z
  .object({
    items: z
      .array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict())
      .min(1)
      .max(30),
    payment_method: z.enum(["cash_on_pickup", "bank_transfer", "instapay", "mobile_wallet"]),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+20|0)1[0125]\d{8}$/, "Enter an Egyptian mobile number."),
    idempotency_key: z.uuid(),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.product_id)).size === v.items.length,
    "Duplicate products are not allowed.",
  );
export const inspectionSchema = z
  .object({
    product_id: z.uuid(),
    condition: z.enum(["A", "B", "C", "D"]),
    scope: z.string().trim().min(10).max(1000),
    findings: z.string().trim().min(10).max(5000),
    known_defects: z.string().max(2000),
    tests: inspectedSpecsJson,
    outcome: z.enum(["passed", "failed"]),
    valid_days: z.coerce.number().int().min(1).max(180),
  })
  .strict()
  .refine(
    (v) => v.outcome !== "passed" || v.condition !== "D",
    "Defective hardware cannot pass verification.",
  );
export function safeReturnPath(value: string | null | undefined, locale: Locale): string {
  if (
    !value ||
    !value.startsWith(`/${locale}/`) ||
    /[\\\r\n]/.test(value) ||
    /%5c|%0a|%0d/i.test(value)
  )
    return `/${locale}/account`;
  const url = new URL(value, "https://pc-exchange.invalid");
  if (!url.pathname.startsWith(`/${locale}/`)) return `/${locale}/account`;
  return url.pathname + url.search;
}
