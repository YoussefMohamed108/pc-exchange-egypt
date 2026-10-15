import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page, locale = "en") {
  await page.goto(`/${locale}`);
  await expect(page.locator('[data-pc-status="ready"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-pc-status]").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-hotspot="gpu"]')).toBeVisible();
}

for (const [part, category] of [
  ["gpu", "graphics-cards"],
  ["cpu", "processors"],
  ["storage", "storage"],
]) {
  test(`clicking the actual ${part} mesh opens its category`, async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page);
    const marker = page.locator(`[data-hotspot="${part}"]`);
    await marker.scrollIntoViewIfNeeded();
    const box = (await marker.boundingBox())!;
    // Let the event hit the WebGL canvas itself, not the accessible HTML link above it.
    await page.addStyleTag({ content: "[data-hotspot] { pointer-events: none !important; }" });
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    expect(
      await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x, y }),
    ).toBe("CANVAS");
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(page).toHaveURL(new RegExp(`/en/catalog\\?category=${category}$`));
    expect(errors).toEqual([]);
  });
}

test("dragging rotates the PC without opening a category", async ({ page, isMobile }) => {
  await ready(page);
  const gpu = page.locator('[data-hotspot="gpu"]');
  const before = (await gpu.boundingBox())!;
  await page.addStyleTag({ content: "[data-hotspot] { pointer-events: none !important; }" });
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: before.x + 22, y: before.y + 22 }],
    });
    for (let step = 1; step <= 10; step++) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: before.x + 22 + step * 6, y: before.y + 22 }],
      });
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(before.x + 22, before.y + 22);
    await page.mouse.down();
    await page.mouse.move(before.x + 82, before.y + 22, { steps: 10 });
    await page.mouse.up();
  }
  await expect(page).toHaveURL(/\/en$/);
  await expect
    .poll(async () => Math.abs(((await gpu.boundingBox())?.x ?? 0) - before.x))
    .toBeGreaterThan(5);
});

test("rotation and reset work from the keyboard", async ({ page }) => {
  await ready(page);
  const gpu = page.locator('[data-hotspot="gpu"]');
  const initial = await gpu.getAttribute("style");
  await page.getByRole("button", { name: "Rotate PC left" }).focus();
  await page.keyboard.press("Enter");
  await expect(gpu).not.toHaveAttribute("style", initial!);
  await page.getByRole("button", { name: "Reset PC view" }).focus();
  await page.keyboard.press("Space");
  await expect(gpu).toHaveAttribute("style", initial!);
  await page.locator('[data-part-link="ram"]').focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/category=memory$/);
});

test("all components keep localized category navigation without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.goto("/ar");
  await expect(page.locator('[data-pc-status="fallback"]')).toBeVisible();
  const categories = {
    gpu: "graphics-cards",
    cpu: "processors",
    ram: "memory",
    motherboard: "motherboards",
    storage: "storage",
    cooling: "cooling",
    power: "power-supplies",
    case: "cases",
  };
  const navigation = page.getByRole("navigation", { name: "فئات مكونات الكمبيوتر" });
  for (const [id, category] of Object.entries(categories)) {
    await expect(navigation.locator(`[data-part-link="${id}"]`)).toHaveAttribute(
      "href",
      `/ar/catalog?category=${category}`,
    );
  }
  await navigation.locator('[data-part-link="power"]').click();
  await expect(page).toHaveURL(/\/ar\/catalog\?category=power-supplies$/);
});
