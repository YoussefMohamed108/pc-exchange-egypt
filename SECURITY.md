# Security

## Implemented controls

- Two active roles (user/admin), owner-checked seller mutations, confirmed-contact setup and signed-in-only contact disclosure with an hourly limit.
- Private benchmark bucket; current-revision PDFs visible to signed-in users, including before review. Only the PC service writes processed evidence. The renderer subprocess has no credentials, bounded memory/CPU/time, a 3 MB file limit and 12-page limit. This is image-only rewriting, not a malware-scanning claim.
- Admin decisions and moderation are audited; self-review, stale edits, superseded evidence and caller-supplied approval fields are rejected. The review badge is derived from the latest approved current revision and expiry.
- Brevo SMTP uses TLS and an authorized-IP restriction; its credential stays on the PC. Real external confirmation delivery was accepted. CAPTCHA and staff MFA remain launch work.

- Server-verified Supabase identity; no reliance on user-supplied roles or `getSession()` authorization.
- Explicit PostgreSQL grants, RLS on all application tables, separate role assignments and restricted transaction functions.
- Inventory cost/serial segregation; ownership-filtered customer orders and safe public projections.
- No service-role credential in Next; public configuration rejects secret keys and legacy service-role JWTs.
- Strict Zod/Pydantic inputs, bounded catalog queries/carts, parameterized SQL and React text encoding.
- Next server-action origin checks and request size limits. Uploads have separate byte/type/pixel constraints.
- Images are decoded, resized and re-encoded; EXIF/GPS metadata is removed. SVG and arbitrary file types are not accepted.
- Inspection status derives from authorized reports and current hardware revision.
- Server-side order prices, transaction locks, retry idempotency, stock checks and per-account order attempt limit.
- Staff-only payment approval with verifier/date audit; references never mark orders paid.
- `nosniff`, denied framing, limited browser permissions, referrer policy and baseline CSP directives.
- Secrets/environment files, generated artifacts and virtual environments are ignored by version control and Docker.

## Live launch requirements

Run the policies against a real Supabase project before launch. Embedded PostgreSQL tests validate application SQL; they do not prove hosted Auth, Storage MIME enforcement, PostgREST view behavior or concurrent multi-connection performance.

Configure email confirmation, SMTP, Auth rate limits/CAPTCHA, HTTPS and authorized redirect origins. Require staff MFA before financial operations. Add deployment-specific CSP nonces/asset permissions; the baseline CSP does not claim a complete script allowlist. Configure provider WAF/rate limits for unauthenticated catalog and auth traffic.

Add private transfer-evidence storage with signed URLs when that workflow is built. Product photos are public; never upload identity documents, transfer receipts or confidential inspector notes to the photo bucket. Authorized staff can also upload through Supabase Studio; avoid bypassing the application's normalization pipeline with unsafe files.

Implement inventory movement history, reservation expiry, refund/cancellation requests, account deletion/retention, restoration drills and durable notifications. Review orphaned product images from abandoned draft forms and implement cleanup before high-volume operations.

The analysis API needs TLS/private network exposure and a sufficiently random service token before deployment. It performs no pricing today. Do not broaden database view grants or add unrestricted security-definer functions without policy tests.

## Dependency checks

`npm audit --audit-level=high` is part of CI. The initial Next-specific ESLint preset pulled an unpatched glob dependency; it was replaced with maintained TypeScript/React/React Hooks lint rules, retaining ESLint while removing the advisory chain. Python requirements are locked to the tested environment; run a current Python advisory scanner as part of future release hardening.

No security incident or credential exposure is claimed. To report a deployment issue, use the repository owner's private reporting channel once one is configured.
