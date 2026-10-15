/* global fetch */
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { setTimeout as wait } from "node:timers/promises";

// This acceptance check targets this PC only. Fixtures are removed in finally.
const env = parseEnv(fs.readFileSync("infrastructure/backend/.env", "utf8"));
assert.ok(
  !env.SMTP_HOST || env.SMTP_HOST === "mailpit",
  "This disposable signup test requires Mailpit; external SMTP must not receive test addresses.",
);
const api = "http://127.0.0.1:54321";
const client = createClient(api, env.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `pcx-acceptance-${randomUUID()}@example.com`;
const password = randomBytes(20).toString("hex");
let userId, messageId;
let checks = 0;
function pass(label) {
  checks++;
  console.log(`PASS ${label}`);
}
function sql(query) {
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
      "-At",
    ],
    { input: query, encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) throw new Error("Local acceptance SQL failed.");
  return result.stdout.trim();
}
try {
  assert.equal((await fetch(`${api}/rest/v1/categories`)).status, 401);
  pass("Gateway rejects requests without the application key");
  for (const route of ["/", "/pg/", "/api/mcp", "/auth/v1/admin/users"]) {
    assert.ok(
      [401, 403, 404].includes(
        (await fetch(api + route, { headers: { apikey: env.ANON_KEY } })).status,
      ),
    );
  }
  pass("Dashboard, database management and Auth administration are not exposed");
  const categories = await client.from("categories").select("slug");
  assert.equal(categories.error, null);
  assert.equal(categories.data.length, 12);
  pass("Real PostgREST reads the migrated public categories");
  assert.equal((await client.from("public_products").select("id")).error, null);
  assert.ok((await client.from("inventory_items").select("*")).error);
  pass("Anonymous customers can read public products but not private inventory");
  const signup = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback?locale=en",
      data: { full_name: "Local acceptance test", role: "super_administrator" },
    },
  });
  assert.equal(signup.error, null);
  userId = signup.data.user.id;
  assert.equal(signup.data.session, null);
  pass("Auth creates an unconfirmed account, ignoring self-selected staff privileges");
  let tokenHash;
  for (let attempt = 0; attempt < 15; attempt++) {
    const mailbox = await fetch("http://127.0.0.1:54324/api/v1/messages").then((r) => r.json());
    const message = mailbox.messages.find((m) => m.To.some((to) => to.Address === email));
    if (message) {
      messageId = message.ID;
      const detail = await fetch(`http://127.0.0.1:54324/api/v1/message/${messageId}`).then((r) =>
        r.json(),
      );
      tokenHash = detail.HTML.match(/token_hash=([a-zA-Z0-9_-]+)/)?.[1];
      break;
    }
    await wait(500);
  }
  assert.ok(tokenHash, "Confirmation mail must contain the SSR token-hash link");
  const verification = await client.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
  assert.equal(verification.error, null);
  pass("Local SMTP captures a valid confirmation link and Auth issues a session");
  const roles = await client.from("account_roles").select("role");
  assert.equal(roles.error, null);
  assert.deepEqual(
    roles.data.map((r) => r.role),
    ["user"],
  );
  assert.ok((await client.from("account_roles").insert({ user_id: userId, role: "admin" })).error);
  pass("Actual customer JWT cannot self-promote through REST");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
    "base64",
  );
  const photo = `products/${randomUUID()}/acceptance.png`;
  const upload = await client.storage
    .from("product-images")
    .upload(photo, png, { contentType: "image/png" });
  assert.ok(upload.error);
  pass("Storage rejects customer inventory uploads");
  assert.match(userId, /^[a-f0-9-]{36}$/);
  sql(`UPDATE public.account_roles SET role='admin' WHERE user_id='${userId}';`);
  const staffUpload = await client.storage
    .from("product-images")
    .upload(photo, png, { contentType: "image/png" });
  assert.equal(staffUpload.error, null);
  const imageUrl = client.storage.from("product-images").getPublicUrl(photo).data.publicUrl;
  assert.equal((await fetch(imageUrl)).status, 200);
  assert.equal((await client.storage.from("product-images").remove([photo])).error, null);
  pass("Staff JWT uploads, publicly reads and removes a photo under Storage RLS");
  await client.auth.signOut();
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  pass("Confirmed account can sign out and sign in with a password");
  const health = await fetch("http://127.0.0.1:8000/v1/health").then((r) => r.json());
  assert.equal(health.status, "ok");
  assert.equal(health.pricing_available, false);
  pass("Local Python API is healthy and does not claim unavailable pricing");
  console.log(`${checks} live local acceptance checks passed.`);
} finally {
  if (userId && /^[a-f0-9-]{36}$/.test(userId))
    sql(`DELETE FROM auth.users WHERE id = '${userId}' AND email = '${email}';`);
  if (messageId)
    await fetch("http://127.0.0.1:54324/api/v1/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ IDs: [messageId] }),
    });
}
