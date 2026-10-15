/* global document, window */
import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Called with disposable users and listing from check-marketplace; no real inspection is claimed.
export async function checkProductOperations({
  base,
  lid,
  seller,
  buyer,
  admin,
  anon,
  photo,
  extraImages,
}) {
  const getListing = async () => {
    const r = await admin.client.from("marketplace_listings").select("*").eq("id", lid).single();
    assert.equal(r.error, null);
    return r.data;
  };
  const reference = (await getListing()).reference_code;
  assert.match(reference, /^PCX-\d+$/);
  assert.ok((await buyer.client.rpc("admin_find_products", { term: reference })).error);
  await buyer.page.goto(`${base}/en/admin/products`);
  await expect(buyer.page).toHaveURL(/account\?notice=forbidden/);
  await seller.page.goto(`${base}/en/account/listings/${lid}`);
  await seller.page
    .locator("#inspection-availability")
    .fill("TEST ONLY — Cairo; afternoon availability.");
  await seller.page.getByRole("button", { name: "Request inspection — EGP 0" }).click();
  await expect(seller.page.locator(".inspection-request")).toContainText("Requested");
  const request = (
    await admin.client.from("inspection_requests").select("*").eq("listing_id", lid).single()
  ).data;
  assert.equal(request.fee_piastres, 0);
  assert.equal(
    (await buyer.client.from("inspection_requests").select("*").eq("id", request.id)).data.length,
    0,
  );
  await admin.page.goto(`${base}/en/admin/products`);
  await admin.page.getByLabel("Find a product").fill(reference);
  await admin.page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(admin.page.locator("tbody tr")).toHaveCount(1);
  await admin.page.getByRole("link", { name: "Manage ↗", exact: true }).click();
  await expect(
    admin.page.getByRole("heading", { name: "DISPOSABLE TEST — NOT FOR SALE", exact: true }),
  ).toBeVisible();
  await expect(admin.page.getByRole("button", { name: "Submit review", exact: true })).toHaveCount(
    0,
  );
  await admin.page
    .getByRole("link", { name: new RegExp(`Manage physical inspections.*${reference}`) })
    .click();
  await expect(admin.page).toHaveURL(/\/admin\/inspections\?q=PCX-\d+&status=all/);
  await expect(admin.page.getByLabel("Product ID", { exact: true })).toHaveValue(reference);
  await expect(admin.page.locator(".physical-review-card")).toHaveCount(1);
  await expect(admin.page.locator(".physical-review-card")).toContainText("Disposable test seller");
  await expect(admin.page.locator(".benchmark-review-card")).toHaveCount(0);
  await expect(
    admin.page
      .locator(".admin-sidebar")
      .getByRole("link", { name: "Free inspection requests", exact: true }),
  ).toHaveCount(0);
  await expect(
    admin.page.locator(".admin-sidebar").getByRole("link", { name: "Inspections", exact: true }),
  ).toHaveCount(1);
  const card = admin.page.locator(".inspection-request");
  const visit = new Date(Date.now() + 3600000);
  const localDate = new Date(visit.getTime() - visit.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await card.locator('input[type="datetime-local"]').fill(localDate);
  await card.locator('[name="note"]').fill("TEST ONLY — disposable appointment.");
  await card.getByRole("button", { name: "Save request decision" }).click();
  await admin.page.getByText("Record physical inspection results", { exact: true }).click();
  await expect(
    admin.page.getByRole("heading", { name: "Physical inspection report", exact: true }),
  ).toBeVisible();
  const form = admin.page.locator("form").filter({
    has: admin.page.getByRole("heading", { name: "Physical inspection report", exact: true }),
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await form.locator('[name="inspected_on"]').fill(today);
  await form.locator('[name="serial_number"]').fill("PRIVATE-DISPOSABLE-IDENTIFIER");
  await form
    .locator('[name="identity_description"]')
    .fill("TEST ONLY — no real device was inspected.");
  for (const select of await form.locator('select[id^="check-"]').all())
    await select.selectOption("pass");
  for (const input of await form.locator('textarea[id^="observation-"]').all())
    await input.fill("TEST ONLY — automated acceptance observation.");
  await form
    .locator('[name="findings"]')
    .fill("DISPOSABLE TEST — NOT A REAL INSPECTION OR PRODUCT.");
  await form.locator('[name="known_defects"]').fill("TEST ONLY — fixture.");
  await form
    .locator('input[type="file"]')
    .setInputFiles({ name: "visit-fixture.png", mimeType: "image/png", buffer: photo });
  await expect(form.locator('[name="photo_paths"]')).not.toHaveValue("[]", { timeout: 20000 });
  extraImages.push(...JSON.parse(await form.locator('[name="photo_paths"]').inputValue()));
  await form.locator('[name="outcome"]').selectOption("passed");
  await form.locator('[name="attended"]').check();
  await form.getByRole("button", { name: "Publish inspection report" }).click();
  await expect(
    admin.page.getByRole("heading", { name: "Physical inspection report", exact: true }),
  ).toHaveCount(0, { timeout: 20000 });
  const report = (
    await admin.client.from("field_inspections").select("id").eq("listing_id", lid).single()
  ).data;
  await buyer.page.goto(`${base}/en/listings/${lid}`);
  await expect(buyer.page.locator(".benchmark-watermark")).toHaveText("PCX Inspected");
  await buyer.page.getByRole("link", { name: /PCX Inspected — view report/ }).click();
  await expect(
    buyer.page.getByRole("heading", { name: "Physical inspection report." }),
  ).toBeVisible();
  assert.ok(!(await buyer.page.content()).includes("PRIVATE-DISPOSABLE-IDENTIFIER"));
  const pub = await anon.from("public_field_inspections").select("*").eq("id", report.id).single();
  assert.equal(pub.error, null);
  assert.ok(!JSON.stringify(pub.data).includes("PRIVATE-DISPOSABLE-IDENTIFIER"));
  console.log(
    "PASS free request, admin ID search, scheduling, checklist, photo upload and physical watermark; full identity remains private",
  );
  await admin.page.setViewportSize({ width: 390, height: 844 });
  await admin.page.goto(`${base}/ar/admin/inspections?q=${reference}&status=completed`);
  await expect(admin.page.locator(".physical-review-card")).toHaveCount(1);
  await expect(admin.page.getByLabel("معرف المنتج", { exact: true })).toHaveValue(reference);
  assert.ok(
    await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  await admin.page.goto(`${base}/ar/admin/benchmarks?q=${lid}&status=all`);
  await expect(admin.page.locator(".benchmark-review-card")).toHaveCount(2);
  await expect(admin.page.locator(".physical-review-card")).toHaveCount(0);
  assert.ok(
    await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  await admin.page.setViewportSize({ width: 1280, height: 900 });
  console.log(
    "PASS distinct applicant queues, one Inspections navigation entry, PCX and UUID lookup, and Arabic mobile queue layouts",
  );
  const operate = async (operation) => {
    await admin.page.goto(`${base}/en/admin/products/seller/${lid}`);
    const controls = admin.page
      .locator("form")
      .filter({ has: admin.page.getByRole("heading", { name: "Product & watermark controls" }) });
    await controls.locator('[name="operation"]').selectOption(operation);
    await controls
      .locator('[name="reason"]')
      .fill("TEST ONLY — product administration acceptance.");
    if (operation === "delete") await controls.locator('[name="confirm_delete"]').check();
    await controls.getByRole("button", { name: "Apply action" }).click();
    await expect
      .poll(async () => {
        const l = await getListing();
        if (operation === "pause") return l.hidden;
        if (operation === "resume") return !l.hidden;
        if (operation === "delete") return !!l.deleted_at;
        if (operation === "restore") return !l.deleted_at && l.hidden && l.status === "draft";
        const r = await admin.client
          .from(operation === "revoke_benchmark" ? "benchmark_submissions" : "field_inspections")
          .select("revoked_at")
          .eq("listing_id", lid)
          .not("revoked_at", "is", null)
          .single();
        return !!r.data?.revoked_at;
      })
      .toBe(true);
  };
  await operate("revoke_benchmark");
  await operate("revoke_inspection");
  await buyer.page.goto(`${base}/en/listings/${lid}`);
  await expect(buyer.page.locator(".benchmark-watermark")).toHaveCount(0);
  await operate("pause");
  assert.equal((await anon.from("all_catalog_products").select("id").eq("id", lid)).data.length, 0);
  await operate("resume");
  await operate("delete");
  await seller.page.goto(`${base}/en/account/listings/${lid}`);
  await expect(seller.page.getByRole("button", { name: "Save listing" })).toHaveCount(0);
  await operate("restore");
  await admin.page.goto(`${base}/en/admin/products/seller/${lid}`);
  await expect(
    admin.page.getByRole("button", { name: "Resume & publish listing", exact: true }),
  ).toBeVisible();
  await admin.page.locator('[name="reason"]').first().fill("TEST ONLY — resume a paused draft.");
  await admin.page.getByRole("button", { name: "Resume & publish listing", exact: true }).click();
  await expect
    .poll(async () => {
      const row = await getListing();
      return row.status === "listed" && !row.hidden;
    })
    .toBe(true);
  await expect(
    admin.page.getByRole("button", { name: "Resume & publish listing", exact: true }),
  ).toHaveCount(0);
  await expect(admin.page.getByText("State: listed", { exact: true })).toBeVisible();
  await admin.page.locator("summary").filter({ hasText: "Edit product details" }).click();
  await admin.page.locator('[name="status"]').selectOption("listed");
  await admin.page.getByRole("button", { name: "Save listing" }).click();
  await expect(admin.page).toHaveURL(/saved=1/, { timeout: 20000 });
  await operate("resume");
  assert.equal((await getListing()).reference_code, reference);
  await admin.page.setViewportSize({ width: 390, height: 844 });
  await admin.page.goto(`${base}/ar/admin/products?q=${reference}`);
  await expect(admin.page.locator("tbody tr")).toHaveCount(1);
  assert.ok(
    await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  await admin.page.screenshot({
    path: ".artifacts/previews/product-admin-ar-test.png",
    fullPage: true,
  });
  console.log(
    "PASS watermark revocation, pause/resume, delete/restore, admin editing, permanent references and Arabic mobile management",
  );
}
