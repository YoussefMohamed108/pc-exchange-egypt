import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Uses only the disposable product owned by the fixture seller.
export async function checkOwnerDeletion({
  base,
  lid,
  seller,
  buyer,
  admin,
  imagePaths,
  evidencePaths,
}) {
  const row = (await seller.client.from("marketplace_listings").select("*").eq("id", lid).single())
    .data;
  assert.ok(row);
  const attack = await buyer.client.rpc("seller_delete_listing", {
    lid,
    expected_updated_at: row.updated_at,
    confirmation: row.reference_code,
  });
  assert.ok(attack.error);
  await seller.page.setViewportSize({ width: 1280, height: 900 });
  await seller.page.goto(`${base}/en/account/listings/${lid}`);
  const danger = seller.page.locator(".permanent-deletion");
  await danger.getByText("Permanently delete product", { exact: true }).click();
  await danger.getByLabel(`Type ${row.reference_code} to confirm`, { exact: true }).fill("PCX-0");
  await danger.locator('[name="confirm_permanent"]').check();
  await danger.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(danger.getByRole("alert")).toContainText("Type the listing ID exactly");
  assert.ok(
    (await seller.client.from("marketplace_listings").select("id").eq("id", lid).maybeSingle())
      .data,
  );
  await danger
    .getByLabel(`Type ${row.reference_code} to confirm`, { exact: true })
    .fill(row.reference_code);
  await expect(danger.locator('[name="confirm_permanent"]')).toBeChecked();
  await danger.screenshot({ path: ".artifacts/previews/owner-permanent-delete-test.png" });
  await danger.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(seller.page).toHaveURL(/account\/listings\?notice=permanently_deleted$/, {
    timeout: 30000,
  });
  await expect(seller.page.getByRole("status")).toContainText("Listing permanently deleted");
  assert.equal(
    (await admin.client.from("marketplace_listings").select("id").eq("id", lid)).data.length,
    0,
  );
  for (const table of ["benchmark_submissions", "inspection_requests", "field_inspections"])
    assert.equal(
      (await admin.client.from(table).select("id").eq("listing_id", lid)).data.length,
      0,
    );
  for (const path of evidencePaths)
    assert.ok((await admin.client.storage.from("benchmark-evidence").download(path)).error);
  for (const path of imagePaths)
    assert.ok((await admin.client.storage.from("marketplace-images").download(path)).error);
  const pending = await seller.client.rpc("seller_pending_file_cleanup");
  assert.equal(pending.error, null);
  assert.deepEqual(pending.data, []);
  await seller.page.goto(`${base}/ar/account/listings?notice=permanently_deleted`);
  await expect(seller.page.getByRole("status")).toContainText("تم حذف الإعلان نهائيًا");
  console.log(
    "PASS owner-only permanent deletion, typed confirmation, retained form input after rejection, dependent report removal, actual photo/PDF cleanup and Arabic success notice",
  );
}
