/* global fetch, AbortSignal */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendEnv = parseEnv(
  fs.readFileSync(path.join(root, "infrastructure/backend/.env"), "utf8"),
);
const redeployExisting = process.argv.includes("--redeploy-existing");
const site = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || backendEnv.SITE_URL;
if (!/^https:\/\/[a-z0-9.-]+\/?$/i.test(site)) throw new Error("Expected an HTTPS site origin.");
const api = new URL(backendEnv.SUPABASE_PUBLIC_URL);
if (api.protocol !== "https:" || new URL(site).protocol !== "https:") {
  throw new Error(
    "Run backend:share and set the deployed site with: node scripts/backend.mjs site https://your-project.vercel.app",
  );
}
const health = await fetch(`${api.origin}/auth/v1/health`, {
  headers: { apikey: backendEnv.ANON_KEY },
  signal: AbortSignal.timeout(15000),
});
if (!health.ok) throw new Error(`The PC backend is unreachable (${health.status}).`);

function vercel(args, options = {}) {
  const privateConfig = path.join(root, ".artifacts/backend/vercel");
  const configDir =
    process.env.PCX_VERCEL_CONFIG ||
    (fs.existsSync(path.join(privateConfig, "auth.json")) ? privateConfig : undefined);
  if (configDir) {
    if (!/^[a-zA-Z0-9:\\/ ._-]+$/.test(configDir))
      throw new Error("Unsupported CLI configuration path.");
    args = [...args, "--global-config", `"${configDir}"`];
  }
  // Arguments are fixed below, never user-provided shell strings. Values go through stdin.
  const result = spawnSync("npx", ["--yes", "vercel@64.0.2", ...args], {
    cwd: root,
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error("Vercel command failed. Inspect the CLI output above.");
}
// Deliberately allowlist PUBLIC configuration. Never copy the backend .env to Vercel.
const publicVariables = {
  NEXT_PUBLIC_SUPABASE_URL: api.origin,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: backendEnv.ANON_KEY,
  NEXT_PUBLIC_SITE_URL: new URL(site).origin,
  NEXT_PUBLIC_DEPLOYMENT_MODE: "preview",
  NEXT_PUBLIC_AUTH_EMAIL_DELIVERY:
    backendEnv.SMTP_HOST && backendEnv.SMTP_HOST !== "mailpit" ? "external" : "local",
};
const statePath = path.join(root, ".artifacts/backend/deployment.json");
const fingerprint = createHash("sha256").update(JSON.stringify(publicVariables)).digest("hex");
let alreadySynchronized = false;
if (redeployExisting && fs.existsSync(statePath)) {
  const previous = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (previous.fingerprint === fingerprint) {
    console.log("Production already uses this backend configuration.");
    alreadySynchronized = true;
  }
}
if (!alreadySynchronized) {
  for (const [key, value] of Object.entries(publicVariables)) {
    vercel(["env", "add", key, "production", "--force", "--yes", "--no-sensitive"], {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
  // Restart recovery reuses the production source stored at Vercel, never the working directory.
  vercel(
    redeployExisting
      ? ["redeploy", new URL(site).hostname, "--target", "production", "--non-interactive"]
      : ["deploy", "--prod", "--yes"],
  );
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      { fingerprint, api: api.origin, site, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
}
