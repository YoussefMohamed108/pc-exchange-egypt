import fs from "node:fs";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";

// Inspect the exact tracked/stageable source set. Never print matched credentials.
const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean),
  ),
];
const blocked = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (
    /(^|\/)(node_modules|\.artifacts|\.vercel|\.venv|\.next)(\/|$)/.test(file) ||
    /(^|\/)\.env(?!\.example$)/.test(file) ||
    /\.(pem|key)$/i.test(file)
  ) {
    blocked.push(`${file}: private/generated path`);
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  if (
    /gh[pousr]_[A-Za-z0-9]{30,}|sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      content,
    )
  )
    blocked.push(`${file}: credential pattern`);
  for (const token of content.matchAll(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const claims = JSON.parse(Buffer.from(token[0].split(".")[1], "base64url").toString());
      if (claims.role === "service_role") blocked.push(`${file}: privileged JWT`);
    } catch {
      /* Not a JWT payload. */
    }
  }
}
if (blocked.length) {
  console.error("Repository check failed:\n" + [...new Set(blocked)].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Repository check passed: ${files.length} source files; no blocked paths or detected credentials.`,
  );
