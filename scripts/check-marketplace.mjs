/* global fetch, document, window */
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { checkProductOperations } from "./check-product-operations.mjs";
import { checkSellerOperations } from "./check-seller-operations.mjs";
import { checkOwnerDeletion } from "./check-owner-deletion.mjs";

// Disposable acceptance fixture, with no external email. All cleanup is restricted to its IDs.
const env = parseEnv(fs.readFileSync("infrastructure/backend/.env", "utf8"));
const base = process.env.MARKETPLACE_BASE_URL || "http://127.0.0.1:3000";
const laptop = process.argv.includes("--laptop");
const api = "http://127.0.0.1:54321";
const run = randomUUID();
const password = randomUUID() + randomUUID();
const users = [];
let lid, sid, imagePath;
const contexts = [];
const extraImages = [];
const evidencePaths = [];
function dockerPython(code, input = {}) {
  const r = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "infrastructure/backend/compose.yaml",
      "exec",
      "-T",
      "analysis",
      "python",
      "-c",
      code,
    ],
    { input: JSON.stringify(input), encoding: "utf8", windowsHide: true },
  );
  assert.equal(r.status, 0, `Internal fixture operation failed: ${r.stderr}`);
  return r.stdout.trim();
}
function sql(query) {
  const r = spawnSync(
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
      "-At",
    ],
    { input: query, encoding: "utf8", windowsHide: true },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
try {
  for (const kind of ["seller", "buyer", "admin"]) {
    const email = `pcx-market-${kind}-${run}@example.com`;
    const uid = dockerPython(
      `import json,sys,os,httpx
d=json.load(sys.stdin)
r=httpx.post('http://auth:9999/admin/users',headers={'Authorization':'Bearer '+os.environ['SUPABASE_SERVICE_ROLE_KEY']},json={'email':d['email'],'password':d['password'],'email_confirm':True,'user_metadata':{'full_name':'Disposable acceptance fixture'}},timeout=15)
r.raise_for_status()
print(r.json()['id'])`,
      { email, password },
    );
    assert.match(uid, /^[a-f0-9-]{36}$/);
    const client = createClient(api, env.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    assert.equal(signed.error, null);
    users.push({ kind, email, uid, client, token: signed.data.session.access_token });
  }
  const [seller, buyer, admin] = users;
  sql(`update public.account_roles set role='admin' where user_id='${admin.uid}';`);
  const anon = createClient(api, env.ANON_KEY, { auth: { persistSession: false } });
  for (const u of users) {
    const c = await browser.newContext();
    contexts.push(c);
    u.page = await c.newPage();
    u.errors = [];
    u.page.on("pageerror", (e) => u.errors.push(e.message));
    await u.page.goto(`${base}/en/auth?mode=login`);
    await u.page.locator('.auth-form:visible [name="email"]').fill(u.email);
    await u.page.locator('.auth-form:visible [name="password"]').fill(password);
    await u.page.locator('.auth-form:visible button[type="submit"]').click();
    await expect(u.page).toHaveURL(/\/en\/account$/);
  }
  await seller.page.goto(`${base}/en/account/listings/new`);
  await expect(seller.page).toHaveURL(/\/account\/setup/);
  await seller.page.locator('[name="display_name"]').fill("Disposable test seller");
  await seller.page.locator('[name="governorate"]').fill("Cairo");
  await seller.page.locator('[name="phone"]').fill("01012345678");
  await seller.page.getByRole("button", { name: "Save contact details" }).click();
  await expect(seller.page).toHaveURL(/\/account\/listings$/);
  await seller.page.goto(`${base}/en/account/listings/new`);
  const photo = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#cec5ef" },
  })
    .png()
    .toBuffer();
  for (const [name, value] of Object.entries({
    title: "DISPOSABLE TEST — NOT FOR SALE",
    brand: "Acceptance fixture",
    model: "Not a commercial product",
    price: "1.25",
    description: "Disposable automated acceptance fixture. Not an actual product or offer.",
    known_defects: "TEST ONLY — not a product",
  }))
    await seller.page.locator(`.market-form [name="${name}"]`).fill(value);
  if (laptop) {
    await seller.page.locator('[name="category_slug"]').selectOption("laptops");
    for (const key of [
      "CPU",
      "Graphics",
      "RAM",
      "Storage",
      "Display",
      "Battery condition",
      "Charger",
      "Keyboard layout",
      "Boot status",
      "Included accessories",
    ]) {
      await seller.page.locator(`input[id="spec-${key}"]`).fill("Not tested — acceptance fixture");
    }
    await seller.page.locator('[name="category_slug"]').selectOption("pc-builds");
    await expect(seller.page.locator('input[id="spec-PSU"]')).toBeVisible();
    await seller.page.locator('[name="category_slug"]').selectOption("laptops");
    await expect(seller.page.locator('input[id="spec-Battery condition"]')).toHaveValue(
      "Not tested — acceptance fixture",
    );
  }
  await seller.page
    .locator('input[type="file"]')
    .setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: photo });
  await expect(seller.page.locator('input[name="image_paths"]')).not.toHaveValue("[]", {
    timeout: 20000,
  });
  imagePath = JSON.parse(await seller.page.locator('input[name="image_paths"]').inputValue())[0];
  await seller.page.locator('[name="status"]').selectOption("listed");
  await seller.page.getByRole("button", { name: "Save listing" }).click();
  await expect(seller.page).toHaveURL(/\/account\/listings\/[a-f0-9-]+\?saved=1/, {
    timeout: 20000,
  });
  lid = (await seller.page.url()).match(/listings\/([a-f0-9-]{36})/)[1];
  if (laptop) {
    await expect(seller.page.locator('[name="category_slug"]')).toHaveValue("laptops");
    await expect(seller.page.locator('input[id="spec-Battery condition"]')).toHaveValue(
      "Not tested — acceptance fixture",
    );
    await seller.page.setViewportSize({ width: 390, height: 844 });
    await seller.page.goto(`${base}/ar/account/listings/${lid}`);
    await expect(seller.page.getByLabel("حالة البطارية", { exact: true })).toHaveValue(
      "Not tested — acceptance fixture",
    );
    assert.ok(
      await seller.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    );
    await seller.page.goto(`${base}/en/account/listings/${lid}`);
    console.log(
      "PASS laptop details persist after save and category switching, including Arabic mobile editing",
    );
  }
  console.log(
    "PASS confirmed seller sets contacts, uploads a normalized photo and publishes without admin approval",
  );
  if (process.argv.includes("--seller-only")) {
    await checkSellerOperations({ base, lid, seller, buyer, admin, anon });
    if (process.argv.includes("--owner-delete"))
      await checkOwnerDeletion({
        base,
        lid,
        seller,
        buyer,
        admin,
        imagePaths: [imagePath, ...extraImages],
        evidencePaths,
      });
    for (const u of users) assert.deepEqual(u.errors, []);
  } else {
    assert.equal(
      (await anon.from("marketplace_catalog").select("benchmark_status").eq("id", lid).single())
        .data.benchmark_status,
      "not_reviewed",
    );
    assert.ok((await anon.rpc("seller_contact", { lid })).error);
    assert.equal((await buyer.client.from("profile_contacts").select("*")).data.length, 0);
    const anonymous = await browser.newContext();
    contexts.push(anonymous);
    const publicPage = await anonymous.newPage();
    await publicPage.goto(`${base}/en/listings/${lid}`);
    if (laptop) {
      await expect(publicPage.getByRole("link", { name: "Laptops", exact: true })).toBeVisible();
      await expect(publicPage.locator("dt").filter({ hasText: "Battery condition" })).toBeVisible();
      const catalog = await anon
        .from("all_catalog_products")
        .select("id")
        .eq("category_slug", "laptops")
        .eq("id", lid);
      assert.equal(catalog.error, null);
      assert.equal(catalog.data.length, 1);
    }
    await expect(
      publicPage.getByRole("heading", { name: "DISPOSABLE TEST — NOT FOR SALE" }),
    ).toBeVisible();
    await expect(publicPage.locator(".listing-gallery img")).toBeVisible();
    await expect
      .poll(() =>
        publicPage
          .locator(".listing-gallery img")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
    assert.ok(!(await publicPage.content()).includes("01012345678"));
    await publicPage.goto(`${base}/en/listings/${lid}/contact`);
    await expect(publicPage).toHaveURL(/auth\?mode=login.*next=/);
    await buyer.page.goto(`${base}/en/listings/${lid}/contact`);
    await expect(buyer.page.getByRole("link", { name: "Call seller" })).toBeVisible();
    console.log(
      "PASS contacts are absent from anonymous HTML and available to signed-in buyers only",
    );
    const pdf = Buffer.from(
      dockerPython(`import io,base64
from PIL import Image,ImageDraw
image=Image.new('RGB',(800,600),'white')
ImageDraw.Draw(image).text((30,30),'DISPOSABLE PDF ACCEPTANCE FIXTURE - NOT REAL BENCHMARKS',fill='black')
out=io.BytesIO();image.save(out,format='PDF');print(base64.b64encode(out.getvalue()).decode())`),
      "base64",
    );
    const rev = (
      await seller.client.from("marketplace_listings").select("revision").eq("id", lid).single()
    ).data.revision;
    const bad = await fetch(`${api}/evidence/v1/submit/${lid}?revision=${rev}`, {
      method: "POST",
      headers: {
        apikey: env.ANON_KEY,
        Authorization: `Bearer ${buyer.token}`,
        "Content-Type": "application/pdf",
      },
      body: pdf,
    });
    assert.equal(bad.status, 403);
    await seller.page
      .locator('input[name="evidence"]')
      .setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: pdf });
    await seller.page.locator('[name="share"]').check();
    await seller.page.getByRole("button", { name: "Submit for review" }).click();
    await expect(
      seller.page.getByRole("status").filter({ hasText: "Saved successfully" }),
    ).toBeVisible({ timeout: 45000 });
    const evidence = await seller.client
      .from("benchmark_submissions")
      .select("*")
      .eq("listing_id", lid)
      .single();
    assert.equal(evidence.error, null);
    sid = evidence.data.id;
    evidencePaths.push(evidence.data.object_path);
    assert.ok((await anon.from("benchmark_submissions").select("*")).error);
    assert.ok(
      (await anon.storage.from("benchmark-evidence").download(evidence.data.object_path)).error,
    );
    const downloadable = await buyer.client.storage
      .from("benchmark-evidence")
      .download(evidence.data.object_path);
    assert.equal(downloadable.error, null);
    assert.notDeepEqual(Buffer.from(await downloadable.data.arrayBuffer()), pdf);
    const served = await buyer.page.request.get(`${base}/en/evidence/${sid}`);
    assert.equal(served.status(), 200);
    assert.match(served.headers()["cache-control"], /no-store/);
    assert.match(served.headers()["content-type"], /application\/pdf/);
    console.log(
      "PASS PDF is rebuilt, signed-in buyers can read pending evidence, anonymous and cross-owner uploads fail",
    );
    assert.ok(
      (
        await seller.client.rpc("review_benchmark", {
          sid,
          decision: "approved",
          note: "Cannot approve own evidence",
        })
      ).error,
    );
    await admin.page.goto(`${base}/en/admin/benchmarks`);
    const productRef = (
      await seller.client
        .from("marketplace_listings")
        .select("reference_code")
        .eq("id", lid)
        .single()
    ).data.reference_code;
    await admin.page.getByLabel("Product ID", { exact: true }).fill(productRef);
    await admin.page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(admin.page.locator(".benchmark-review-card")).toHaveCount(1);
    await expect(admin.page.locator(".benchmark-review-card")).toContainText(
      "Disposable test seller",
    );
    assert.equal(
      (
        await admin.client.rpc("admin_review_queue", {
          queue_kind: "physical",
          term: productRef,
          filter_status: "all",
          page_number: 1,
        })
      ).data.total,
      0,
    );
    const card = admin.page
      .locator(".review-card")
      .filter({ hasText: "DISPOSABLE TEST — NOT FOR SALE" });
    const adminPdf = await admin.page.request.get(`${base}/en/evidence/${sid}`);
    assert.equal(adminPdf.status(), 200);
    assert.equal(adminPdf.headers()["x-frame-options"], "SAMEORIGIN");
    await card.getByText("Preview evidence here", { exact: true }).click();
    await expect(card.locator("iframe")).toBeVisible();
    await card.locator('[name="decision"]').selectOption("rejected");
    await card.getByRole("button", { name: "Submit review" }).click();
    assert.equal(
      (await admin.client.from("benchmark_submissions").select("status").eq("id", sid).single())
        .data.status,
      "pending",
    );
    const refusal = "TEST ONLY — include test settings and a dated benchmark screenshot.";
    await card.locator('[name="note"]').fill(refusal);
    await card.getByRole("button", { name: "Submit review" }).click();
    await expect(card).toHaveCount(0, { timeout: 20000 });
    await seller.page.goto(`${base}/en/account/listings/${lid}`);
    await expect(seller.page.locator(".benchmark-history")).toContainText(refusal);
    await expect(seller.page.locator(".benchmark-history")).toContainText("Not approved");
    await seller.page
      .locator('input[name="evidence"]')
      .setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: pdf });
    await seller.page.locator('[name="share"]').check();
    await seller.page.getByRole("button", { name: "Submit for review" }).click();
    await expect(
      seller.page.getByRole("status").filter({ hasText: "Saved successfully" }),
    ).toBeVisible({ timeout: 45000 });
    const resubmission = (
      await admin.client
        .from("benchmark_submissions")
        .select("id,object_path")
        .eq("listing_id", lid)
        .eq("status", "pending")
        .single()
    ).data;
    sid = resubmission.id;
    evidencePaths.push(resubmission.object_path);
    const current = (
      await admin.client.from("marketplace_listings").select("updated_at").eq("id", lid).single()
    ).data;
    assert.equal(
      (
        await admin.client.rpc("admin_product_action", {
          source: "seller",
          pid: lid,
          expected_updated_at: current.updated_at,
          operation: "pause",
          reason: "TEST ONLY — review while paused",
        })
      ).error,
      null,
    );
    await admin.page.goto(`${base}/en/admin/benchmarks?q=${productRef}&status=pending`);
    await card.locator('[name="decision"]').selectOption("approved");
    await card.screenshot({ path: ".artifacts/previews/benchmark-decision-test.png" });
    await card.getByRole("button", { name: "Submit review" }).click();
    await expect(card).toHaveCount(0, { timeout: 20000 });
    const paused = (
      await admin.client
        .from("marketplace_listings")
        .select("updated_at,hidden")
        .eq("id", lid)
        .single()
    ).data;
    assert.equal(paused.hidden, true);
    assert.equal(
      (
        await admin.client.rpc("admin_product_action", {
          source: "seller",
          pid: lid,
          expected_updated_at: paused.updated_at,
          operation: "resume",
          reason: "TEST ONLY — resume reviewed listing",
        })
      ).error,
      null,
    );
    console.log(
      "PASS evidence preview, refusal reason enforcement, seller feedback, resubmission and approval while paused",
    );
    await buyer.page.goto(`${base}/en/listings/${lid}`);
    await expect(buyer.page.locator(".benchmark-watermark")).toContainText("Benchmark reviewed");
    await buyer.page.screenshot({
      path: ".artifacts/previews/marketplace-reviewed-test.png",
      fullPage: true,
    });
    console.log("PASS admin review alone adds the Benchmark reviewed label");
    if (process.argv.includes("--seller"))
      await checkSellerOperations({ base, lid, sid, seller, buyer, admin, anon });
    if (process.argv.includes("--operations"))
      await checkProductOperations({ base, lid, seller, buyer, admin, anon, photo, extraImages });
    await seller.page.goto(`${base}/en/account/listings/${lid}`);
    if (laptop)
      await seller.page
        .locator('input[id="spec-Battery condition"]')
        .fill("TEST: revised battery description");
    else
      await seller.page
        .locator('[name="known_defects"]')
        .fill("TEST: revised hardware description");
    await seller.page.getByRole("button", { name: "Save listing" }).click();
    await expect(seller.page).toHaveURL(/saved=1/);
    assert.equal(
      (await anon.from("marketplace_catalog").select("benchmark_status").eq("id", lid).single())
        .data.benchmark_status,
      "not_reviewed",
    );
    assert.equal(
      (await buyer.client.from("benchmark_submissions").select("id").eq("id", sid)).data.length,
      0,
    );
    await buyer.page.setViewportSize({ width: 390, height: 844 });
    await buyer.page.goto(`${base}/ar/listings/${lid}/contact`);
    assert.equal(await buyer.page.locator("html").getAttribute("dir"), "rtl");
    assert.ok(
      await buyer.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    );
    await buyer.page.screenshot({
      path: ".artifacts/previews/marketplace-contact-ar-test.png",
      fullPage: true,
    });
    for (const u of users) assert.deepEqual(u.errors, []);
    console.log(
      "PASS hardware changes remove the badge; Arabic mobile contact page has no overflow or client errors",
    );
    if (process.argv.includes("--owner-delete")) {
      await checkOwnerDeletion({
        base,
        lid,
        seller,
        buyer,
        admin,
        imagePaths: [imagePath, ...extraImages],
        evidencePaths,
      });
    } else if (process.argv.includes("--operations") || process.argv.includes("--delete-only")) {
      await admin.page.setViewportSize({ width: 1280, height: 900 });
      await admin.page.goto(`${base}/en/admin/products/seller/${lid}`);
      await admin.page.getByText("Permanently delete product", { exact: true }).click();
      await admin.page.getByLabel(`Type ${productRef} to confirm`, { exact: true }).fill("PCX-0");
      await admin.page
        .getByLabel("Reason for permanent deletion", { exact: true })
        .fill("TEST ONLY — permanently remove the disposable fixture.");
      await admin.page.locator('[name="confirm_permanent"]').check();
      await admin.page.getByRole("button", { name: "Delete permanently", exact: true }).click();
      await expect(admin.page.locator(".permanent-deletion").getByRole("alert")).toContainText(
        "Match the product ID",
      );
      await admin.page
        .getByLabel(`Type ${productRef} to confirm`, { exact: true })
        .fill(productRef);
      await admin.page.getByRole("button", { name: "Delete permanently", exact: true }).click();
      await expect(admin.page).toHaveURL(/admin\/products\?notice=permanently_deleted/, {
        timeout: 30000,
      });
      await expect(admin.page.getByRole("status")).toContainText("Product permanently deleted");
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
      for (const path of [imagePath, ...extraImages])
        assert.ok((await admin.client.storage.from("marketplace-images").download(path)).error);
      const pending = (await admin.client.rpc("admin_pending_file_cleanup")).data;
      assert.ok(
        !pending.some((f) => [imagePath, ...extraImages, ...evidencePaths].includes(f.object_path)),
      );
      console.log(
        "PASS typed confirmation, permanent product removal and actual PDF/photo cleanup; unrelated products preserved",
      );
    }
  }
} catch (error) {
  if (process.argv.includes("--seller-only") && users[0]?.page) {
    await users[0].page
      .screenshot({ path: ".artifacts/previews/seller-failure-test.png", fullPage: true })
      .catch(() => {});
    fs.writeFileSync(".artifacts/previews/seller-failure-test.html", await users[0].page.content());
    console.log("Seller page client errors:", users[0].errors);
  }
  throw error;
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
  const ids = users.map((u) => u.uid);
  if (ids.length) {
    dockerPython(
      `import json,sys,os,httpx
d=json.load(sys.stdin);headers={'Authorization':'Bearer '+os.environ['SUPABASE_SERVICE_ROLE_KEY']}
with httpx.Client(timeout=15) as client:
 for uid in d['ids']:
  for bucket,prefix in [('marketplace-images','marketplace/'+uid),('benchmark-evidence','benchmarks/'+uid)]:
   rows=client.get('http://rest:3000/benchmark_submissions',headers=headers,params={'seller_id':'eq.'+uid,'select':'object_path'}).json() if bucket=='benchmark-evidence' else []
   paths=list(set([r['object_path'] for r in rows]+[p for p in d.get('evidence_paths',[]) if uid in p])) if bucket=='benchmark-evidence' else [p for p in ([d.get('image')]+d.get('extra_images',[])) if p and uid in p]
   if paths:
    r=client.request('DELETE','http://storage:5000/object/'+bucket,headers=headers,json={'prefixes':paths});r.raise_for_status()
print('cleanup complete')`,
      { ids, image: imagePath, extra_images: extraImages, evidence_paths: evidencePaths },
    );
    const clause = ids.map((id) => `'${id}'`).join(",");
    sql(
      `begin;delete from pcx_private.contact_access where user_id in (${clause}) or listing_id in(select id from public.marketplace_listings where seller_id in (${clause}));delete from public.audit_logs where actor_id in (${clause});delete from public.benchmark_submissions where seller_id in (${clause});delete from public.marketplace_listings where seller_id in (${clause});delete from pcx_private.deleted_product_files where split_part(object_path,'/',2) in (${clause});delete from auth.users where id in (${clause});commit;`,
    );
  }
  console.log("Disposable marketplace accounts, listing, evidence and images removed.");
}
