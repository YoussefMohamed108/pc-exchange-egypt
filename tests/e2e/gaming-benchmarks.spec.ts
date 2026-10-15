import { test, expect } from "@playwright/test";

test("AAA games show sourced results without inventing missing 1080p measurements", async ({
  page,
}) => {
  await page.goto("/en/benchmarks?view=gaming");
  const game = page.getByRole("combobox", { name: "Game", exact: true });
  await expect(game.locator("option")).toHaveCount(16);
  await game.selectOption("alan-wake-2");
  await expect(page.getByText("No published 1080p measurements", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show 1440p", exact: true }).click();
  await expect(page.locator(".fps-row")).toHaveCount(6);
  await expect(page.locator(".fps-row").first()).toContainText("89");
  await page
    .getByRole("button", { name: "Compare Nvidia GeForce RTX 4070 Super 12GB", exact: true })
    .click();
  await expect(page.locator(".fps-compare-grid")).toContainText("Not reported");
  await page.getByRole("button", { name: "4K", exact: true }).click();
  await expect(page.locator(".fps-row").first()).toContainText("49");
  await game.selectOption("red-dead-2");
  await expect(page.locator(".fps-row")).toHaveCount(7);
  await expect(page.locator(".fps-row").first()).toContainText("57");
  await expect(page.locator(".fps-test-strip")).toContainText("2019");
  await page.getByRole("button", { name: "1080p", exact: true }).click();
  await expect(page.locator(".fps-row").first()).toContainText("114");
  await game.selectOption("resident-evil-requiem");
  await expect(page.getByText("No published 1080p measurements", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show 1440p", exact: true }).click();
  await expect(page.locator(".fps-row")).toHaveCount(6);
  await expect(page.locator(".fps-row").first()).toContainText("137");
  await page.getByText("Test platform & rendering details", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Open the source chart/ })).toHaveAttribute(
    "href",
    "https://www.techspot.com/articles-info/3133/bench/RE.png",
  );
  for (const id of ["spider-man-2", "forza-horizon-6", "hogwarts", "starfield", "last-of-us-1"]) {
    await game.selectOption(id);
    await expect(page.locator(".fps-row")).toHaveCount(6);
  }
  await game.selectOption("hogwarts");
  await page.getByRole("button", { name: "Processors CPU", exact: true }).click();
  await expect(game).toHaveValue("hogwarts");
  await expect(page.locator(".fps-row")).toHaveCount(5);
  await expect(page.locator(".fps-test-strip")).toContainText("RT Ultra");
  await expect(page.locator(".fps-row").first()).toContainText("56");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("Arabic AAA discovery keeps sources, missing resolutions and CPU rankings clear", async ({
  page,
}) => {
  await page.goto("/ar/benchmarks?view=gaming");
  const game = page.getByRole("combobox", { name: "اللعبة", exact: true });
  await game.selectOption("resident-evil-requiem");
  await expect(page.getByText("لا توجد قياسات منشورة بدقة 1080p", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "عرض 1440p", exact: true }).click();
  await expect(page.locator(".fps-row").first()).toContainText("١٣٧");
  await page.getByRole("button", { name: "المعالجات CPU", exact: true }).click();
  await game.selectOption("last-of-us-1");
  await page.getByRole("button", { name: "4K", exact: true }).click();
  await expect(page.locator(".fps-row")).toHaveCount(5);
  await expect(page.locator(".fps-row").first()).toContainText("٨٥");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("gaming view compares actual FPS across resolutions and resets when the test changes", async ({
  page,
}) => {
  await page.goto("/en/benchmarks");
  await page.getByRole("link", { name: /Gaming FPS/ }).click();
  await expect(page).toHaveURL(/view=gaming/);
  await expect(page.locator(".fps-row")).toHaveCount(4);
  const first = page.locator(".fps-row").first();
  await expect(first).toContainText("157");
  await page.getByRole("button", { name: "Compare GeForce RTX 5090", exact: true }).click();
  await page.getByRole("button", { name: "Compare GeForce RTX 5080", exact: true }).click();
  await page.getByRole("button", { name: "Compare Radeon RX 9070 16GB", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Compare Radeon RX 9060 XT 16GB", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".fps-compare-grid article")).toHaveCount(3);
  await page.getByRole("button", { name: "1440p", exact: true }).click();
  await expect(first).toContainText("132");
  await page.getByRole("button", { name: "4K", exact: true }).click();
  await expect(first).toContainText("90");
  await expect(page.locator(".fps-compare-grid article").first()).toContainText("157");
  await expect(page.locator(".fps-compare-grid article").first()).toContainText("132");
  await expect(page.locator(".fps-compare-grid article").first()).toContainText("90");
  await page.getByRole("combobox", { name: "Game", exact: true }).selectOption("cyberpunk");
  await expect(page.locator(".fps-compare-grid article")).toHaveCount(0);
  await expect(first).toContainText("55");
  await expect(page.locator(".fps-test-strip")).toContainText("Not reported");
  await page.getByRole("combobox", { name: "Test series", exact: true }).selectOption("radeon");
  await expect(page.locator(".fps-row")).toHaveCount(6);
  await expect(first).toContainText("64");
  await expect(page.locator(".fps-test-strip > a")).toHaveAttribute(
    "href",
    "https://www.techspot.com/review/3069-six-years-radeon-tested-midrange/",
  );
  await page.getByRole("searchbox", { name: "Search gaming models" }).fill("RTX 5090");
  await expect(page.getByText("No measured result for this model here")).toBeVisible();
  await page.getByRole("button", { name: "Processors CPU", exact: true }).click();
  await page.getByRole("combobox", { name: "Game", exact: true }).selectOption("marvel");
  await expect(page.getByRole("combobox", { name: "Game", exact: true })).toHaveValue("marvel");
  await expect(page.locator(".fps-row")).toHaveCount(2);
  await expect(page.locator(".fps-test-strip")).toContainText("GeForce RTX 5090");
  await expect(first).toContainText("90");
  await page.getByRole("button", { name: "1080p", exact: true }).click();
  await expect(first).toContainText("157");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("hardware discovery finds older generations and distinguishes unpublished resolutions", async ({
  page,
}) => {
  await page.goto("/en/benchmarks?view=gaming");
  const family = page.getByRole("combobox", { name: "Generation / socket" });
  const model = page.getByRole("combobox", { name: "Find hardware across the library" });
  await family.selectOption("rtx20");
  await model.selectOption("2060");
  await expect(page.getByRole("combobox", { name: "Game", exact: true })).toHaveValue(
    "cyberpunk-original",
  );
  await expect(page.locator(".fps-row")).toHaveCount(1);
  await expect(page.locator(".fps-row")).toContainText("53");
  await page.getByRole("button", { name: "4K", exact: true }).click();
  await expect(page.locator(".fps-row")).toContainText("16");
  await page.getByRole("button", { name: "Processors CPU", exact: true }).click();
  await family.selectOption("intel9");
  await model.selectOption("9600k");
  await expect(page.locator(".fps-row")).toContainText("71");
  await family.selectOption("intel11");
  await expect(page.getByText("No published 4K measurements", { exact: true })).toBeVisible();
  await expect(page.locator(".fps-row")).toHaveCount(0);
  await page.getByText("Test platform & rendering details", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Open the source chart/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Show 1080p", exact: true }).click();
  await expect(page.locator(".fps-row")).toContainText("110");
  await page.getByRole("button", { name: "Compare Intel Core i9-11900K", exact: true }).click();
  await expect(page.locator(".fps-compare-grid")).toContainText("Not reported");
  await family.selectOption("am4");
  await model.selectOption("5700x3d");
  await expect(page.locator(".fps-row")).toContainText("157");
  await expect(page.locator(".fps-compare-grid article")).toHaveCount(0);
  await family.selectOption("am5");
  await model.selectOption("7800x3d");
  await expect(page.locator(".fps-row")).toContainText("202");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("Arabic gaming view exposes sources and works without overflow", async ({ page }) => {
  await page.goto("/ar/benchmarks?view=gaming");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "المعالجات CPU", exact: true }).click();
  await page.getByRole("combobox", { name: "اللعبة", exact: true }).selectOption("space-marine");
  await page.getByRole("button", { name: "1440p", exact: true }).click();
  await page.getByRole("searchbox", { name: "ابحث في موديلات الألعاب" }).fill("7600");
  await expect(page.locator(".fps-row")).toHaveCount(1);
  await expect(page.locator(".fps-row")).toContainText("٩٠");
  await expect(page.locator(".fps-filter-summary")).toContainText("بحث نشط");
  await page.getByRole("button", { name: "إزالة فلاتر القطع", exact: true }).click();
  await expect(page.locator(".fps-row")).toHaveCount(2);
  await expect(page.getByRole("combobox", { name: "اللعبة", exact: true })).toHaveValue(
    "space-marine",
  );
  await page.getByRole("button", { name: "مقارنة AMD Ryzen 5 7600X", exact: true }).click();
  await expect(page.locator(".fps-compare-grid article")).toHaveCount(1);
  await page.getByText("منصة الاختبار وإعدادات الرندر", { exact: true }).click();
  await expect(page.getByRole("link", { name: /افتح رسم المصدر/ })).toHaveAttribute(
    "href",
    "https://www.techspot.com/articles-info/3017/bench/SM-2U.png",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("All models keeps the visible review and clearing hardware filters restores its full ranking", async ({
  page,
}) => {
  await page.goto("/en/benchmarks?view=gaming");
  const family = page.getByRole("combobox", { name: "Generation / socket" });
  const model = page.getByRole("combobox", { name: "Find hardware across the library" });
  const game = page.getByRole("combobox", { name: "Game", exact: true });
  const series = page.getByRole("combobox", { name: "Test series", exact: true });
  await family.selectOption("rtx20");
  await expect(page.locator(".fps-row")).toHaveCount(7);
  await model.selectOption("2060");
  await expect(page.locator(".fps-row")).toHaveCount(1);
  await model.selectOption("all");
  await expect(game).toHaveValue("cyberpunk-original");
  await expect(series).toHaveValue("cyberpunk-2020");
  await expect(page.locator(".fps-row")).toHaveCount(7);
  await page.getByRole("button", { name: "Processors CPU", exact: true }).click();
  await family.selectOption("intel11");
  await expect(page.locator(".fps-row")).toHaveCount(1);
  await expect(page.locator(".fps-filter-summary")).toContainText("Showing 1 of 28 models");
  await expect(page.locator(".fps-filter-summary")).toContainText("Intel 11th gen");
  await page.getByRole("button", { name: "Clear hardware filters", exact: true }).click();
  await expect(family).toHaveValue("all");
  await expect(model).toHaveValue("all");
  await expect(game).toHaveValue("battlefield");
  await expect(series).toHaveValue("bf6-cpu");
  await expect(page.locator(".fps-row")).toHaveCount(28);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
