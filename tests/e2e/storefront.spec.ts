import { test, expect } from "@playwright/test";
test("laptops are reachable and filterable in English and Arabic", async ({ page }) => {
  for (const [locale, link, heading, category, brand, apply] of [
    ["en", "Laptops Take it with you.", "Laptops.", "Category", "Brand", "Apply filters"],
    [
      "ar",
      "لابتوبات خد إمكانياتك معاك.",
      "لابتوبات.",
      "الفئة",
      "العلامة التجارية",
      "تطبيق التصفية",
    ],
  ]) {
    await page.goto(`/${locale}`);
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(/category=laptops$/);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByLabel(category, { exact: true })).toHaveValue("laptops");
    await page.getByLabel(brand, { exact: true }).fill("No such laptop fixture");
    await page.getByRole("button", { name: apply, exact: true }).click();
    await expect(page.getByLabel(category, { exact: true })).toHaveValue("laptops");
    await expect(
      page.getByRole("heading", {
        name: locale === "en" ? "No matching hardware yet" : "لا توجد مكونات مطابقة حالياً",
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
test("complete PCs are reachable directly from the homepage", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Looking for a complete PC?" }).click();
  await expect(page).toHaveURL(/category=pc-builds$/);
  await expect(page.getByRole("heading", { name: "Complete PCs.", exact: true })).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("pc-builds");
});
test("visiting the confirmation page cannot fake email verification", async ({ page }) => {
  await page.goto("/en/auth/verified?verified=true");
  await expect(
    page.getByRole("heading", { name: "Verification not completed yet." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account verified.", exact: true })).toHaveCount(
    0,
  );
  await page.goto("/auth/confirm?token_hash=invalid&type=signup&locale=en");
  await expect(page).toHaveURL(/error=confirmation/);
});
test("English homepage is usable and fits the viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "A new life. For your next build." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready for a second act." })).toBeVisible();
  // A configured backend may have real inventory; unavailable/error states must still fail.
  await expect(
    page
      .locator(".product-card")
      .first()
      .or(page.getByRole("heading", { name: "The next drop is taking shape." }))
      .first(),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
test("switches English to Arabic with true RTL", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "العربية", exact: true }).click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "حياة جديدة. لتجميعتك الجايّة." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test("category navigation and catalog filters preserve query state", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("navigation", { name: "PC component categories" })
    .getByRole("link", { name: "01 Graphics card", exact: true })
    .click();
  await expect(page).toHaveURL(/category=graphics-cards/);
  await page.getByLabel("Brand", { exact: true }).fill("NVIDIA");
  await page.getByLabel("Min. price (EGP)").fill("1000");
  await page.getByLabel("Inspection or benchmark review").check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/verified=true/);
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("NVIDIA");
  await expect(page.getByRole("heading", { name: "No matching hardware yet" })).toBeVisible();
});
test("invalid price filters return a helpful state", async ({ page }) => {
  await page.goto("/en/catalog?min=500&max=100");
  await expect(page.getByRole("heading", { name: "Check your filters" })).toBeVisible();
});
test("search text is escaped", async ({ page }) => {
  await page.goto("/en/catalog?q=%3Cscript%3Ewindow.pwned%3Dtrue%3C%2Fscript%3E");
  await expect(page.getByRole("main").getByRole("searchbox")).toHaveValue(
    "<script>window.pwned=true</script>",
  );
  expect(await page.evaluate(() => Reflect.get(window, "pwned"))).toBeUndefined();
});
test("guest administration redirects to account login", async ({ page }) => {
  await page.goto("/en/admin/inventory/new");
  await expect(page).toHaveURL(/\/en\/auth\?mode=login/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
test("cart rejects corrupt browser state", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pc-exchange-cart-v1",
      JSON.stringify([{ product_id: "invalid", quantity: -3 }]),
    ),
  );
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "A little room for possibility" })).toBeVisible();
});
test("mobile navigation works with keyboard dismissal", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Drawer is a mobile control");
  await page.goto("/en");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("#mobile-navigation").getByRole("link", { name: "Shop hardware" }).click();
  await expect(page).toHaveURL(/\/en\/catalog$/);
});
