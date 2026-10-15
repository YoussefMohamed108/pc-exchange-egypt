/* global fetch, AbortSignal */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(root, ".artifacts/backend");
fs.mkdirSync(stateDir, { recursive: true });
const paused = path.join(stateDir, "autostart.paused");
const logPath = path.join(stateDir, "autostart.log");
const statusPath = path.join(stateDir, "autostart-status.json");
const privateEnv = path.join(root, "infrastructure/backend/.env");
const config = JSON.parse(
  fs.readFileSync(path.join(stateDir, "autostart-config.json"), "utf8").replace(/^\uFEFF/, ""),
);
process.env.PCX_VERCEL_CONFIG = config.vercelConfig;
process.env.PATH = [
  config.dockerDir,
  config.cloudflaredDir,
  path.dirname(process.execPath),
  process.env.PATH,
].join(path.delimiter);

function log(message) {
  let safe = String(message);
  for (const value of Object.values(parseEnv(fs.readFileSync(privateEnv, "utf8")))) {
    if (value.length >= 20) safe = safe.replaceAll(value, "[redacted]");
  }
  if (fs.existsSync(logPath) && fs.statSync(logPath).size > 2_000_000) {
    fs.writeFileSync(`${logPath}.previous`, fs.readFileSync(logPath));
    fs.truncateSync(logPath);
  }
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${safe}\n`);
}
function status(state, detail = "") {
  fs.writeFileSync(
    statusPath,
    JSON.stringify(
      { state, detail, pid: process.pid, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
}
function run(exe, args, timeout = 600_000) {
  const result = spawnSync(exe, args, { cwd: root, windowsHide: true, encoding: "utf8", timeout });
  if (result.stdout?.trim()) log(result.stdout.trim());
  if (result.stderr?.trim()) log(result.stderr.trim());
  if (result.error || result.status !== 0)
    throw new Error(`${path.basename(exe)} ${args[0]} failed; see autostart.log.`);
}
function script(file, args) {
  run(process.execPath, [path.join(root, "scripts", file), ...args]);
}
async function health(url) {
  try {
    return (
      await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: parseEnv(fs.readFileSync(privateEnv, "utf8")).ANON_KEY },
        signal: AbortSignal.timeout(12000),
      })
    ).ok;
  } catch {
    return false;
  }
}

let failures = 0;
let tunnelFailures = 0;
let started = false;
log("Startup supervisor started.");
try {
  const authCheck = JSON.parse(
    fs.readFileSync(path.join(config.vercelConfig, "auth.json"), "utf8"),
  );
  log(
    `Vercel existing login readable: ${Boolean(authCheck.token)}. Config directory: ${config.vercelConfig}`,
  );
} catch (error) {
  log(`Vercel login check: ${error.code || "unreadable"}`);
}
while (true) {
  try {
    if (fs.existsSync(paused)) {
      status("paused", "Run npm run backend:resume to resume automatic recovery.");
    } else {
      if (!started || !(await health("http://127.0.0.1:54321"))) {
        status("starting-docker");
        const engine = spawnSync(config.docker, ["info", "--format", "{{.ServerVersion}}"], {
          windowsHide: true,
          timeout: 15000,
          stdio: "ignore",
        });
        if (engine.status !== 0)
          run(config.docker, ["desktop", "start", "--timeout", "180"], 210000);
        status("starting-backend");
        script("backend.mjs", ["start"]);
        started = true;
      }
      const statePath = path.join(stateDir, "tunnel.json");
      const tunnel = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, "utf8"))
        : null;
      if (!tunnel || !(await health(tunnel.url))) {
        status("connecting-tunnel");
        // Allow temporary outages to heal before replacing only our recorded tunnel.
        if (++tunnelFailures >= 3) script("backend.mjs", ["tunnel-stop"]);
        script("backend.mjs", ["share"]);
        const current = JSON.parse(fs.readFileSync(statePath, "utf8"));
        if (!(await health(current.url))) throw new Error("Tunnel is warming up.");
      }
      tunnelFailures = 0;
      status("syncing-frontend");
      script("deploy-vercel.mjs", ["--redeploy-existing"]);
      status(
        "ready",
        "Docker, backend and tunnel are healthy; production connection is synchronized.",
      );
      failures = 0;
    }
  } catch (error) {
    failures++;
    log(error.message);
    status("retrying", error.message);
  }
  if (process.argv.includes("--once")) break;
  await wait(Math.min(300000, 60000 * Math.max(1, failures)));
}
