import { test, expect } from "@playwright/test";
test("reference search, comparison limits and category reset", async ({ page }) => {
  await page.goto("/en/benchmarks");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Know the power");
  const search = page.getByRole("searchbox", { name: "Search benchmark models" });
  await search.fill("RTX 3060");
  await expect(page.locator(".bench-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Compare NVIDIA GeForce RTX 3060", exact: true }).click();
  await expect(page.locator(".bench-compare-grid article")).toHaveCount(1);
  await search.fill("");
  await page.getByRole("button", { name: "Compare NVIDIA GeForce RTX 5090", exact: true }).click();
  await page.getByRole("button", { name: "Compare NVIDIA GeForce RTX 4090", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Compare NVIDIA GeForce RTX 5080", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Storage SSD/ }).click();
  await expect(page.locator(".bench-compare-grid article")).toHaveCount(0);
  await expect(page.locator(".bench-row")).toHaveCount(6);
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("writeScore");
  await expect(page.locator(".bench-row").first()).toContainText("WD BLACK SN850X");
  await expect(page.locator(".bench-row").first().getByRole("link")).toHaveAttribute(
    "href",
    "https://www.storagereview.com/review/wd-black-sn850x-ssd-review",
  );
  await search.fill("no such device");
  await expect(page.getByText("No result for that model")).toBeVisible();
});
test("Arabic library stays inside the viewport", async ({ page }) => {
  await page.goto("/ar/benchmarks");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("اعرف القوة");
  await page.getByRole("button", { name: /المعالجات CPU/ }).click();
  await page.getByRole("searchbox", { name: "ابحث عن موديل" }).fill("5600");
  await expect(page.locator(".bench-row")).toHaveCount(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
