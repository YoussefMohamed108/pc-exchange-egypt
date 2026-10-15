/* global fetch */
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { URL } from "node:url";
import fs from "node:fs";
import { parseEnv } from "node:util";
import { setTimeout as wait } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

// Uses the real PC-backed Auth service and local test mailbox. No external mail is sent.
const base = process.env.CONFIRMATION_BASE_URL || "http://localhost:3000";
const env = parseEnv(fs.readFileSync("infrastructure/backend/.env", "utf8"));
assert.ok(
  !env.SMTP_HOST || env.SMTP_HOST === "mailpit",
  "This disposable signup test requires Mailpit; external SMTP must not receive test addresses.",
);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
function removeFixture(email) {
  assert.match(email, /^pcx-confirmation-[a-f0-9-]+@example\.com$/);
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "infrastructure/backend/compose.yaml",
      "exec",
      "-T",
      "db",
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `DELETE FROM auth.users WHERE email='${email}';`,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0, "Disposable confirmation account must be removed");
}
try {
  for (const locale of ["en", "ar"]) {
    const email = `pcx-confirmation-${randomUUID()}@example.com`;
    const password = randomBytes(20).toString("hex");
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let messageId;
    try {
      await page.goto(`${base}/${locale}/auth/verified`);
      await expect(
        page.getByRole("heading", {
          name: locale === "en" ? "Verification not completed yet." : "لم يكتمل التأكيد بعد.",
        }),
      ).toBeVisible();
      await page.goto(`${base}/${locale}/auth?mode=register`);
      const form = page.locator(".auth-form:visible");
      await form.locator('[name="full_name"]').fill("Disposable confirmation test");
      await form.locator('[name="email"]').fill(email);
      await form.locator('[name="password"]').fill(password);
      await form.getByRole("button").click();
      await expect(
        page.getByRole("status").filter({
          hasText:
            locale === "en"
              ? /Check your email|Confirmation requested in the local test inbox/
              : /راجع بريدك الإلكتروني|تم طلب رابط التأكيد في صندوق الاختبار المحلي/,
        }),
      ).toBeVisible();
      let link;
      for (let attempt = 0; attempt < 20; attempt++) {
        const inbox = await fetch("http://127.0.0.1:54324/api/v1/messages").then((r) => r.json());
        const message = inbox.messages.find((m) => m.To.some((to) => to.Address === email));
        if (message) {
          messageId = message.ID;
          const detail = await fetch(`http://127.0.0.1:54324/api/v1/message/${messageId}`).then(
            (r) => r.json(),
          );
          link = detail.HTML.match(/href="([^"]*token_hash=[^"]+)"/)?.[1].replaceAll("&amp;", "&");
          break;
        }
        await wait(500);
      }
      assert.ok(link, "The confirmation email must contain the token link");
      assert.ok(new URL(link).origin === new URL(base).origin, "Email must target the tested site");
      // An account cannot sign in with its password before confirmation.
      await page.goto(`${base}/${locale}/auth?mode=login`);
      await page.locator('.auth-form:visible [name="email"]').fill(email);
      await page.locator('.auth-form:visible [name="password"]').fill(password);
      await page.locator(".auth-form:visible").getByRole("button").click();
      await expect(page.locator(".auth-form:visible .notice.error")).toBeVisible();
      await page.goto(link);
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth/verified`));
      await expect(
        page.getByRole("heading", {
          name: locale === "en" ? "Account verified." : "تم تأكيد الحساب.",
        }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: locale === "en" ? "Continue" : "متابعة", exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
      await expect(page.getByText(email, { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: locale === "en" ? "Sign out" : "تسجيل الخروج", exact: true })
        .click();
      await page.goto(link);
      await expect(page).toHaveURL(/error=confirmation/);
      await expect(
        page.getByText(
          locale === "en" ? /invalid, expired or already used/ : /رابط التأكيد غير صالح/,
        ),
      ).toBeVisible();
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${locale}: registration, unconfirmed-login denial, verified result, authenticated continuation and used-link error`,
      );
    } finally {
      await context.close();
      removeFixture(email);
      if (messageId)
        await fetch("http://127.0.0.1:54324/api/v1/messages", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ IDs: [messageId] }),
        });
    }
  }
} finally {
  await browser.close();
}
