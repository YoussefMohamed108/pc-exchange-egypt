/* global document, window */
import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Only the disposable fixture created by check-marketplace is changed.
export async function checkSellerOperations({ base, lid, sid, seller, buyer, admin, anon }) {
  const current = async () => {
    const result = await seller.client
      .from("marketplace_listings")
      .select("*")
      .eq("id", lid)
      .single();
    assert.equal(result.error, null);
    return result.data;
  };
  const original = await current();
  const visible = async (expected) => {
    const result = await anon.from("marketplace_catalog").select("id").eq("id", lid);
    assert.equal(result.error, null);
    assert.equal(result.data.length, expected ? 1 : 0);
    if (!expected) {
      const contact = await buyer.client.rpc("seller_contact", { lid });
      assert.ok(contact.error || !contact.data?.length);
      if (sid) {
        const evidence = await buyer.page.request.get(`${base}/en/evidence/${sid}`);
        assert.equal(evidence.status(), 404);
      }
    }
  };
  const controls = seller.page.locator(".seller-controls:visible");
  await seller.page.setViewportSize({ width: 1280, height: 900 });
  await seller.page.goto(`${base}/en/account/listings`);
  await expect(controls.getByRole("button", { name: "Mark as sold", exact: true })).toBeVisible();
  const forbidden = await buyer.client.rpc("seller_listing_action", {
    lid,
    operation: "delete",
    expected_updated_at: original.updated_at,
    confirmation: original.reference_code,
  });
  assert.ok(forbidden.error);
  await controls.getByRole("button", { name: "Pause listing", exact: true }).click();
  await expect(controls.getByRole("button", { name: "Resume listing", exact: true })).toBeVisible();
  await visible(false);
  const pausedSearch = await admin.client.rpc("admin_find_products", {
    term: original.reference_code,
    kind: "seller",
    state: "paused",
    page_number: 1,
  });
  assert.equal(pausedSearch.data.total, 1);
  await seller.page.screenshot({
    path: ".artifacts/previews/seller-paused-test.png",
    fullPage: true,
  });
  await controls.getByRole("button", { name: "Resume listing", exact: true }).click();
  await expect(controls.getByRole("button", { name: "Pause listing", exact: true })).toBeVisible();
  await visible(true);
  await controls.getByRole("button", { name: "Mark as sold", exact: true }).click();
  await expect(controls.getByRole("button", { name: "Relist product", exact: true })).toBeVisible();
  await expect(controls.getByRole("status")).toContainText("Sold");
  await visible(false);
  await controls.getByRole("button", { name: "Relist product", exact: true }).click();
  await expect(controls.getByRole("button", { name: "Pause listing", exact: true })).toBeVisible();
  await visible(true);
  await controls.getByText("Delete listing", { exact: true }).click();
  await expect(
    controls.getByRole("button", { name: "Move to Deleted", exact: true }),
  ).toBeDisabled();
  await controls.getByRole("checkbox").check();
  await controls.getByRole("button", { name: "Move to Deleted", exact: true }).click();
  await expect(seller.page).toHaveURL(/account\/listings\?notice=deleted$/);
  await expect(seller.page.locator(".market-row")).toHaveCount(0);
  await visible(false);
  await seller.page
    .locator(".seller-list-tabs")
    .getByRole("link", { name: "Deleted", exact: true })
    .click();
  await expect(seller.page.locator(".market-row")).toContainText(original.reference_code);
  await controls.getByRole("button", { name: "Restore as draft", exact: true }).click();
  await expect(seller.page.locator(".market-row")).toHaveCount(0);
  await visible(false);
  await seller.page.goto(`${base}/en/account/listings/${lid}`);
  await expect(seller.page.locator('[name="status"]')).toHaveValue("draft");
  await seller.page.locator('[name="status"]').selectOption("listed");
  await seller.page.getByRole("button", { name: "Save listing", exact: true }).click();
  await expect(seller.page).toHaveURL(/saved=1/);
  await visible(true);
  assert.equal((await current()).revision, original.revision);
  assert.equal((await current()).reference_code, original.reference_code);
  assert.equal(
    (await anon.from("marketplace_catalog").select("benchmark_status").eq("id", lid).single()).data
      .benchmark_status,
    sid ? "benchmark_reviewed" : "not_reviewed",
  );

  // A seller can undo their own deletion, but cannot undo an admin's pause or deletion.
  const moderate = async (operation) => {
    const result = await admin.client.rpc("admin_product_action", {
      source: "seller",
      pid: lid,
      expected_updated_at: (await current()).updated_at,
      operation,
      reason: "Disposable seller-control acceptance test",
    });
    assert.equal(result.error, null);
  };
  await moderate("pause");
  await seller.page.reload();
  await expect(controls).toContainText("Paused by admin");
  await expect(controls.getByRole("button", { name: "Resume listing", exact: true })).toHaveCount(
    0,
  );
  await moderate("delete");
  const restore = await seller.client.rpc("seller_listing_action", {
    lid,
    operation: "restore",
    expected_updated_at: (await current()).updated_at,
  });
  assert.ok(restore.error);
  await seller.page.reload();
  await expect(controls.getByRole("button", { name: "Restore as draft", exact: true })).toHaveCount(
    0,
  );
  await moderate("restore");
  await moderate("resume");

  await seller.page.setViewportSize({ width: 390, height: 844 });
  await seller.page.goto(`${base}/ar/account/listings/${lid}`);
  await controls.getByRole("button", { name: "إيقاف مؤقت", exact: true }).click();
  await expect(
    controls.getByRole("button", { name: "استئناف الإعلان", exact: true }),
  ).toBeVisible();
  assert.equal(await seller.page.locator("html").getAttribute("dir"), "rtl");
  assert.ok(
    await seller.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  await expect(controls).toHaveCount(1);
  await controls.screenshot({ path: ".artifacts/previews/seller-controls-ar-test.png" });
  await controls.getByRole("button", { name: "استئناف الإعلان", exact: true }).click();
  await expect(controls.getByRole("button", { name: "إيقاف مؤقت", exact: true })).toBeVisible();
  await seller.page.goto(`${base}/en/account/listings/${lid}`);
  await visible(true);
  console.log(
    `PASS seller pause/resume, sold/relist, confirmed delete/draft restore, public/contact${sid ? "/PDF" : ""} removal, ownership and admin restrictions, stable reference${sid ? "/review" : ""}, Arabic mobile controls`,
  );
}
