/* global document */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(".artifacts/previews", { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
for (const [name, viewport, path] of [
  ["desktop", { width: 1440, height: 1000 }, "/en"],
  ["mobile", { width: 390, height: 844 }, "/en"],
  ["arabic", { width: 1440, height: 1000 }, "/ar"],
  ["arabic-mobile", { width: 390, height: 844 }, "/ar"],
  ["catalog", { width: 1440, height: 1000 }, "/en/catalog"],
  ["auth", { width: 1440, height: 1000 }, "/en/auth"],
  ["verification", { width: 1440, height: 1000 }, "/en/verification"],
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000"}${path}`);
  await page.locator(".footer-bottom").waitFor({ state: "attached" });
  if (await page.locator("[data-pc-status]").count()) {
    await page.waitForFunction(() => {
      const status = document.querySelector("[data-pc-status]")?.getAttribute("data-pc-status");
      return status === "ready" || status === "fallback";
    });
    console.log(name, await page.locator("[data-pc-status]").getAttribute("data-pc-status"));
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `.artifacts/previews/${name}.png`,
    fullPage: true,
    caret: "initial",
  });
  await page.close();
}
await browser.close();
console.log("Saved desktop, mobile, and Arabic previews in .artifacts/previews.");
