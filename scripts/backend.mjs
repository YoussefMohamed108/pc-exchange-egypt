/* global fetch, AbortSignal */
import { spawn, spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { setTimeout as wait } from "node:timers/promises";
import { createHmac, randomBytes, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "infrastructure/backend");
const envPath = path.join(backend, ".env");
const stateDir = path.join(root, ".artifacts/backend");
const command = process.argv[2] || "status";
fs.mkdirSync(stateDir, { recursive: true });

export function readBackendEnv() {
  return parseEnv(fs.readFileSync(envPath, "utf8"));
}
function saveEnv(values) {
  fs.writeFileSync(
    envPath,
    Object.entries(values)
      .map(([k, v]) => `${k}=${JSON.stringify(String(v))}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
}
function redirectAllowlist(origins) {
  return [...new Set(origins)]
    .flatMap((origin) => [
      `${origin}/auth/callback`,
      `${origin}/auth/confirm`,
      ...["en", "ar"].flatMap((locale) => [
        `${origin}/auth/callback?locale=${locale}`,
        `${origin}/auth/callback?locale=${locale}&next=/${locale}/auth/verified`,
        `${origin}/auth/callback?locale=${locale}&next=/${locale}/auth?mode=update`,
      ]),
    ])
    .join(",");
}
function initialize() {
  if (fs.existsSync(envPath)) return;
  const secret = randomBytes(48).toString("hex");
  const token = (role) => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role, iss: "supabase", iat: now, exp: now + 5 * 365 * 86400 })}`;
    return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  };
  saveEnv({
    POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
    POSTGRES_HOST: "db",
    POSTGRES_PORT: "5432",
    POSTGRES_DB: "postgres",
    JWT_SECRET: secret,
    JWT_EXPIRY: "3600",
    JWT_JWKS: "",
    ANON_KEY: token("anon"),
    SERVICE_ROLE_KEY: token("service_role"),
    SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
    ANON_KEY_ASYMMETRIC: "",
    SERVICE_ROLE_KEY_ASYMMETRIC: "",
    DASHBOARD_USERNAME: "pcx",
    DASHBOARD_PASSWORD: randomBytes(32).toString("hex"),
    SUPABASE_PUBLIC_URL: "http://127.0.0.1:54321",
    API_EXTERNAL_URL: "http://127.0.0.1:54321/auth/v1",
    SITE_URL: "http://localhost:3000",
    ADDITIONAL_REDIRECT_URLS: redirectAllowlist(["http://localhost:3000", "http://127.0.0.1:3000"]),
    DISABLE_SIGNUP: "false",
    ENABLE_EMAIL_SIGNUP: "true",
    ENABLE_EMAIL_AUTOCONFIRM: "false",
    ENABLE_ANONYMOUS_USERS: "false",
    ENABLE_PHONE_SIGNUP: "false",
    ENABLE_PHONE_AUTOCONFIRM: "false",
    MAILER_URLPATHS_INVITE: "/auth/v1/verify",
    MAILER_URLPATHS_CONFIRMATION: "/auth/v1/verify",
    MAILER_URLPATHS_RECOVERY: "/auth/v1/verify",
    MAILER_URLPATHS_EMAIL_CHANGE: "/auth/v1/verify",
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_MAX_ROWS: "1000",
    PGRST_DB_EXTRA_SEARCH_PATH: "public,extensions",
    GLOBAL_S3_BUCKET: "pc-exchange",
    STORAGE_TENANT_ID: "pc-exchange",
    REGION: "local",
    IMGPROXY_AUTO_WEBP: "true",
    S3_PROTOCOL_ACCESS_KEY_ID: randomBytes(16).toString("hex"),
    S3_PROTOCOL_ACCESS_KEY_SECRET: randomBytes(32).toString("hex"),
    PRICING_SERVICE_TOKEN: randomBytes(32).toString("hex"),
  });
  console.log("Generated private backend credentials. Existing credentials are never replaced.");
}
function compose(args, options = {}) {
  const result = spawnSync(
    "docker",
    ["compose", "--project-directory", backend, "-f", path.join(backend, "compose.yaml"), ...args],
    { cwd: root, stdio: "inherit", windowsHide: true, ...options },
  );
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || `Docker command failed (${result.status}).`);
  return result.stdout;
}
function sql(input) {
  return compose(
    ["exec", "-T", "db", "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}
function migrate() {
  const folder = path.join(root, "supabase/migrations");
  for (const filename of fs
    .readdirSync(folder)
    .filter((f) => /^\d+_[a-z0-9_]+\.sql$/.test(f))
    .sort()) {
    const migration = fs.readFileSync(path.join(folder, filename), "utf8").replaceAll("\r\n", "\n");
    const checksum = createHash("sha256").update(migration).digest("hex");
    sql(String.raw`BEGIN;
SELECT pg_advisory_xact_lock(762035428);
CREATE SCHEMA IF NOT EXISTS pcx_private;
REVOKE ALL ON SCHEMA pcx_private FROM PUBLIC, anon;
CREATE TABLE IF NOT EXISTS pcx_private.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON TABLE pcx_private.schema_migrations FROM PUBLIC, anon, authenticated;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pcx_private.schema_migrations WHERE name = '${filename}' AND checksum <> '${checksum}') THEN RAISE EXCEPTION 'Applied migration has changed'; END IF; END $$;
SELECT NOT EXISTS (SELECT 1 FROM pcx_private.schema_migrations WHERE name = '${filename}') AS apply_migration \gset
\if :apply_migration
${migration}
INSERT INTO pcx_private.schema_migrations(name, checksum) VALUES ('${filename}', '${checksum}');
\endif
NOTIFY pgrst, 'reload schema';
COMMIT;
`);
    console.log(`Migration checked: ${filename}`);
  }
}
function writeFrontendEnv() {
  const backendEnv = readBackendEnv();
  const frontendPath = path.join(root, ".env.local");
  const existing = fs.existsSync(frontendPath)
    ? parseEnv(fs.readFileSync(frontendPath, "utf8"))
    : {};
  Object.assign(existing, {
    NEXT_PUBLIC_SUPABASE_URL: backendEnv.SUPABASE_PUBLIC_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: backendEnv.ANON_KEY,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_DEPLOYMENT_MODE: "preview",
    NEXT_PUBLIC_AUTH_EMAIL_DELIVERY:
      backendEnv.SMTP_HOST && backendEnv.SMTP_HOST !== "mailpit" ? "external" : "local",
    PRICING_API_URL: "http://127.0.0.1:8000",
  });
  fs.writeFileSync(
    frontendPath,
    Object.entries(existing)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log("Updated .env.local with public connection values only.");
}
function isOurTunnel(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `$taskTunnel = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($taskTunnel.Name -eq 'cloudflared.exe' -and $taskTunnel.CommandLine.Contains('http://127.0.0.1:54321')) { 'owned' }`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    return result.status === 0 && result.stdout.trim() === "owned";
  }
  try {
    const args = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
    return path.basename(args[0]) === "cloudflared" && args.includes("http://127.0.0.1:54321");
  } catch {
    return false;
  }
}
async function ready() {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:54321/auth/v1/health", {
        headers: { apikey: readBackendEnv().ANON_KEY },
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) return;
    } catch {
      /* Wait for gateway service discovery. */
    }
    await wait(2000);
  }
  throw new Error("The backend API is not ready. Inspect Docker service health.");
}
async function share() {
  await ready();
  const statePath = path.join(stateDir, "tunnel.json");
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (isOurTunnel(state.pid)) {
      try {
        process.kill(state.pid, 0);
        const response = await fetch(`${state.url}/auth/v1/health`, {
          headers: { apikey: readBackendEnv().ANON_KEY },
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          console.log(`Existing tunnel: ${state.url}`);
          return;
        }
      } catch {
        /* Restart only after previous process is gone. */
      }
      try {
        process.kill(state.pid, 0);
        throw new Error(
          "Existing tunnel process is alive but unhealthy. Stop it with backend:stop before restarting.",
        );
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
  }
  const logPath = path.join(stateDir, "tunnel.log");
  const log = fs.openSync(logPath, "w");
  const child = spawn(
    "cloudflared",
    ["tunnel", "--url", "http://127.0.0.1:54321", "--no-autoupdate", "--protocol", "http2"],
    { detached: true, windowsHide: true, stdio: ["ignore", log, log] },
  );
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.unref();
  fs.closeSync(log);
  for (let attempt = 0; attempt < 30; attempt++) {
    await wait(2000);
    const match = fs
      .readFileSync(logPath, "utf8")
      .match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const env = readBackendEnv();
      env.SUPABASE_PUBLIC_URL = match[0];
      env.API_EXTERNAL_URL = `${match[0]}/auth/v1`;
      saveEnv(env);
      fs.writeFileSync(
        statePath,
        JSON.stringify(
          { pid: child.pid, url: match[0], startedAt: new Date().toISOString() },
          null,
          2,
        ),
      );
      compose(["up", "-d", "--no-build", "--pull", "never", "--wait"]);
      writeFrontendEnv();
      console.log(
        `Temporary API URL: ${match[0]}\nRun npm run deploy:vercel to update the frontend. Keep this PC running.`,
      );
      return;
    }
  }
  throw new Error("Cloudflare did not return a tunnel URL. Inspect .artifacts/backend/tunnel.log.");
}

try {
  if (command === "init") {
    initialize();
    writeFrontendEnv();
  } else if (command === "up") {
    initialize();
    compose(["up", "-d", "--build", "--wait", "--wait-timeout", "180"]);
    migrate();
    await ready();
    writeFrontendEnv();
    console.log("Backend ready. Local email: http://127.0.0.1:54324");
  } else if (command === "start") {
    // Login recovery starts installed images; code changes and migrations are explicit operations.
    readBackendEnv();
    compose(["up", "-d", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "180"]);
    await ready();
  } else if (command === "tunnel-stop") {
    const statePath = path.join(stateDir, "tunnel.json");
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (isOurTunnel(state.pid)) process.kill(state.pid);
      fs.unlinkSync(statePath);
    }
  } else if (command === "mail") {
    const settingsPath = path.join(backend, ".env.smtp");
    if (!fs.existsSync(settingsPath))
      throw new Error(
        "Fill infrastructure/backend/.env.smtp with your verified sender and SMTP settings first.",
      );
    const settings = parseEnv(fs.readFileSync(settingsPath, "utf8"));
    const keys = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_ADMIN_EMAIL",
      "SMTP_SENDER_NAME",
    ];
    if (
      keys.some((key) => !settings[key]?.trim()) ||
      !["465", "587", "2525"].includes(settings.SMTP_PORT) ||
      !/^[a-z0-9.-]+$/i.test(settings.SMTP_HOST) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.SMTP_ADMIN_EMAIL)
    )
      throw new Error(
        "SMTP settings are incomplete. Use the provider's host, TLS port, SMTP login/key and verified sender email.",
      );
    const env = readBackendEnv();
    for (const key of keys) env[key] = settings[key];
    saveEnv(env);
    compose(["up", "-d", "--wait", "auth"]);
    writeFrontendEnv();
    console.log(
      "External SMTP configured. Credentials remain on this PC. Redeploy, then use Resend confirmation to verify actual inbox delivery.",
    );
  } else if (command === "migrate") migrate();
  else if (command === "share") await share();
  else if (command === "site") {
    const origin = new URL(process.argv[3]).origin;
    if (!origin.startsWith("https://")) throw new Error("The deployed site must use HTTPS.");
    const env = readBackendEnv();
    env.SITE_URL = origin;
    env.ADDITIONAL_REDIRECT_URLS = redirectAllowlist([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      origin,
    ]);
    saveEnv(env);
    compose(["up", "-d", "--wait"]);
    console.log(`Auth redirects configured for ${origin}`);
  } else if (command === "status") compose(["ps"]);
  else if (command === "logs") {
    let output = compose(["logs", "--no-color", "--tail", "20", process.argv[3] || "api-gw"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const value of Object.values(readBackendEnv()).filter((v) => v.length >= 20))
      output = output.replaceAll(value, "[redacted]");
    console.log(output);
  } else if (command === "stop") {
    fs.writeFileSync(
      path.join(stateDir, "autostart.paused"),
      "Paused by backend:stop. Run backend:resume to recover.\n",
    );
    const statePath = path.join(stateDir, "tunnel.json");
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      try {
        if (isOurTunnel(state.pid)) process.kill(state.pid);
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      fs.unlinkSync(statePath);
    }
    compose(["stop"]);
    console.log("Stopped. Database and photos are preserved.");
  } else
    throw new Error(
      "Use init, up, start, migrate, mail, share, tunnel-stop, site <https-origin>, status or stop.",
    );
} catch (error) {
  // Do not print process options or environment values: they can contain secrets.
  console.error(error.message);
  process.exitCode = 1;
}
