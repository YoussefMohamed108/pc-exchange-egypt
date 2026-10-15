import { describe, expect, it } from "vitest";
import { egpToPiastres, formatMoney } from "@/lib/money";
import {
  catalogFiltersSchema,
  inventorySchema,
  checkoutSchema,
  safeReturnPath,
} from "@/lib/validation";
import { canManageInventory, canInspect } from "@/lib/domain";

describe("exact money", () => {
  it("converts decimal strings without floating point rounding", () => {
    expect(egpToPiastres("1250.05")).toBe(125005);
    expect(egpToPiastres("0.29")).toBe(29);
    expect(egpToPiastres("0002.5")).toBe(250);
  });
  it("rejects fractional piastres, negatives and unsafe amounts", () => {
    for (const value of ["-1", "1.001", "1e6", "NaN", "999999999999999999"]) {
      expect(() => egpToPiastres(value)).toThrow();
    }
  });
  it("formats EGP", () => expect(formatMoney(125000, "en")).toContain("1,250"));
});

describe("server input boundaries", () => {
  it("rejects impossible filters and unbounded pagination", () => {
    expect(catalogFiltersSchema.safeParse({ min: "500", max: "100" }).success).toBe(false);
    expect(catalogFiltersSchema.safeParse({ page: "-1" }).success).toBe(false);
    expect(catalogFiltersSchema.safeParse({ sort: "price; DROP TABLE products" }).success).toBe(
      false,
    );
  });
  it("accepts Arabic queries and valid price ranges", () => {
    expect(
      catalogFiltersSchema.parse({ q: "بطاقة رسومات", min: "100", max: "200", verified: "true" })
        .verified,
    ).toBe(true);
  });
  it("does not accept zero stock or caller verification claims", () => {
    const input = {
      title: "Graphics card",
      title_ar: "",
      category_slug: "graphics-cards",
      brand: "Brand",
      model: "Model",
      description: "An accurately described component.",
      description_ar: "",
      condition: "A",
      price: "1500.50",
      purchase_cost: "1000",
      sku: "GPU-001",
      quantity: 1,
      warranty_months: 0,
      governorate: "Cairo",
      status: "draft",
      specifications: "{}",
      image_paths: "",
    };
    expect(inventorySchema.safeParse(input).success).toBe(true);
    expect(inventorySchema.safeParse({ ...input, quantity: 0 }).success).toBe(false);
    expect(
      inventorySchema.safeParse({ ...input, verification_status: "platform_verified" }).success,
    ).toBe(false);
  });
  it("rejects client submitted checkout prices", () => {
    const data = {
      items: [{ product_id: "00000000-0000-4000-8000-000000000001", quantity: 1 }],
      payment_method: "cash_on_pickup",
      phone: "01012345678",
      idempotency_key: "00000000-0000-4000-8000-000000000002",
    };
    expect(checkoutSchema.safeParse(data).success).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...data, items: [{ ...data.items[0], price: 1 }] }).success,
    ).toBe(false);
  });
  it("contains redirects within a locale", () => {
    expect(safeReturnPath("https://evil.example", "en")).toBe("/en/account");
    expect(safeReturnPath("//evil.example", "ar")).toBe("/ar/account");
    expect(safeReturnPath("/en/admin", "en")).toBe("/en/admin");
    expect(safeReturnPath("/en/\\evil", "en")).toBe("/en/account");
    expect(safeReturnPath("/en/../other", "en")).toBe("/en/account");
  });
});

describe("role boundaries", () => {
  it("restricts operations and reviews to the admin role", () => {
    expect(canManageInventory(["user"])).toBe(false);
    expect(canManageInventory(["admin"])).toBe(true);
    expect(canInspect(["user"])).toBe(false);
    expect(canInspect(["admin"])).toBe(true);
  });
});
