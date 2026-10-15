import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

// Authenticate from the backend's network without sending an email or logging credentials.
const settings = parseEnv(fs.readFileSync("infrastructure/backend/.env.smtp", "utf8"));
const script = `import json,sys,smtplib,ssl
settings=json.load(sys.stdin)
try:
 with smtplib.SMTP(settings['SMTP_HOST'],int(settings['SMTP_PORT']),timeout=20) as smtp:
  smtp.ehlo()
  smtp.starttls(context=ssl.create_default_context())
  smtp.ehlo()
  smtp.login(settings['SMTP_USER'],settings['SMTP_PASS'])
  print('SMTP TLS and authentication accepted')
except smtplib.SMTPResponseException as e:
 print('SMTP response:',e.smtp_code,e.smtp_error.decode(errors='replace'))
 sys.exit(1)
except Exception as e:
 print('SMTP connection failed:',type(e).__name__)
 sys.exit(1)
`;
const result = spawnSync(
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
    script,
  ],
  { input: JSON.stringify(settings), encoding: "utf8", windowsHide: true },
);
let output = result.stdout || "";
for (const key of [settings.SMTP_USER, settings.SMTP_PASS])
  if (key) output = output.replaceAll(key, "[redacted]");
console.log(output.trim());
process.exitCode = result.status || 0;
