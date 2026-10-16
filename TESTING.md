# Testing

## Listing approval acceptance — 16 October 2026

All 97 unit/database/metadata tests pass across 13 suites, including publication authorization, backfill, stale decisions, refusal reasons, revision invalidation and independent benchmark review. All 8 Python API tests pass in the locked-dependency Docker image with current source mounted read-only. TypeScript, ESLint, formatting and repository credential checks pass. The supported webpack production build passes; the local Turbopack PostCSS subprocess exits before connection, so the normal Linux CI build is a separate required check.

All 49 applicable desktop/mobile browser regressions pass against the local production build, with one intentional desktop skip. The installed Edge channel was used because Playwright's separate Chromium binary is absent on this PC. This does not establish remote CI or hosted Supabase acceptance.

The new migration was applied to the actual PC-hosted database after a private backup. Focused real Auth/REST/Storage/PDF checks pass: pending listing/contact/evidence privacy, confirmed role guards, PCX/UUID queue lookup, required refusal reasons, resubmission, evidence upload before publication, benchmark approval without publication, approved buyer access, price preservation, content invalidation and owner-only review history. Existing marketplace acceptance scripts now explicitly approve disposable listings at public-access boundaries, rather than assuming immediate publication; those script adaptations were statically checked.

Domain, branded mail and final deployed browser acceptance are recorded separately in `PROJECT_PROGRESS.md`. Do not infer actual mail delivery or a completed deployment from unit tests.

## Git integration acceptance — 15 October 2026

[PR #1 CI run 38666753214](https://github.com/YoussefMohamed108/pc-exchange-egypt/actions/runs/38666753214) passes 85 unit/database tests, 49 browser checks (one intentional skip), 7 Python tests and all static/build/repository checks. The three added environment tests preserve an explicit production origin, select Vercel's generated preview origin when unset, and retain localhost for local development.

The automatic protected preview was checked using short-lived, origin-scoped Vercel authentication. Its health response confirms no database is configured; sitemap links use its own hostname; English empty inventory, benchmark search and Arabic mobile layout pass without browser errors. The PR remains blocked by the required independent review after its checks pass. Rebuilding the existing production source also passed both Vercel GitHub checks and automatic alias assignment, verifying compatibility with tunnel recovery. No new source was merged or published to production.

## Seller deletion acceptance — 15 October 2026

All 82 unit/database/model/data tests and all 49 applicable desktop/mobile browser checks pass (one intentional desktop skip). Owner permanent-deletion coverage checks confirmed ownership, direct private-function denial, exact PCX confirmation, stale timestamps, related record removal, shared-file preservation, owner-only cleanup and the audit trail. TypeScript, ESLint, formatting and the production build pass. Historical counts below describe earlier milestones.

`node scripts/check-marketplace.mjs --laptop --seller --operations --owner-delete` passes against a local production frontend and the real PC-hosted Supabase stack. It verifies seller controls, private contact/PDF access, benchmark refusal and approval, physical inspections, admin moderation, Arabic mobile layouts, rejected incorrect confirmation and permanent owner deletion of records and actual Storage files. Disposable fixtures are cleaned up; existing user listings are not changed.

The same full acceptance also passes against Vercel deployment `dpl_FSaouek7S1WWaQ82csxeeGEvYNs8` through the production Vercel hostname and real PC backend. Actual photo/PDF removal and fixture cleanup are verified. This is PC-hosted Supabase acceptance, not hosted Supabase or a new SMTP-delivery test.

Set `MARKETPLACE_BASE_URL` to the frontend origin to choose local or deployed acceptance. `--owner-delete` selects seller permanent deletion; omitting it retains the admin permanent-delete scenario. `npm run check:repository` checks the exact tracked/stageable file set for private/generated paths and recognizable credentials before publication. This is an additional guard, not a guarantee that arbitrary secrets can always be detected.

[GitHub CI run 38664129436](https://github.com/YoussefMohamed108/pc-exchange-egypt/actions/runs/38664129436) independently passes the same 82 unit/database and 49 browser checks (one intentional skip) on Linux, all 7 Python tests, static/build checks, repository checks and an npm audit with zero vulnerabilities. CI uses the unconfigured storefront and isolated database fixtures, not the PC backend.

## Marketplace and external SMTP acceptance — 14 October 2026

47 unit/database/model tests and 7 Python/API/PDF tests pass. `node scripts/check-marketplace.mjs` passes against the real local Docker backend and Next.js: confirmed account login; required contacts; normalized photo; immediate listing; anonymous privacy; signed-in contacts; owner-only PDF processing; private pending evidence visible to buyers; admin-only review badge; hardware-edit invalidation; Arabic mobile layout. Fixtures are deleted in cleanup. Set `MARKETPLACE_BASE_URL` for Vercel acceptance; no external email is sent by this script.

Before the SMTP switch, the updated 11 backend checks and both English/Arabic confirmation journeys passed with Mailpit. These two scripts now refuse to run with external SMTP to avoid mailing test addresses. Brevo TLS authentication passed; real owner confirmation was recorded Delivered, then Auth recorded the account as confirmed. Provider configuration alone was not treated as delivery evidence.

The full local browser run passed 29 tests with one skip and two stale-label failures; the updated filter-label checks passed on both desktop/mobile (plus two fallback-navigation checks). Thus all 31 browser cases passed. Later live deployment evidence is recorded in `PROJECT_PROGRESS.md`.

Vercel deployment `dpl_7ummAr9HXg9YKnKbBzgH4i3pqmP6`: all 31 deployed browser tests passed with one intentional desktop skip, and the full marketplace script passed against the public production alias. This includes actual server-action photo upload, PDF processing through the HTTPS tunnel, authenticated private PDF retrieval, admin review and hardware-change invalidation. All disposable fixtures were removed. ESLint, TypeScript, formatting and production builds passed.

## Automated suites

`npm test` runs domain validation, exact monetary parsing, role boundaries, public-key validation, image normalization and PostgreSQL application policy/workflow tests. SQL tests use PGlite's real PostgreSQL engine with an isolated `auth.users`/`auth.uid()` test scaffold. Fixtures are explicitly named test fixtures and are never inserted into application inventory.

Database coverage includes RLS enabled on every application table, denied role escalation, denied inventory/report writes, hidden drafts/costs, inspector authority, report invalidation, stale saves, server prices, duplicate/idempotent orders, insufficient stock, disabled payment methods, order privacy, required payment verification, cancellation release, multi-item rollback and payment-reference ownership/state. A minimal isolated Storage schema also exercises the photo migration and object policies; live Storage service MIME/size enforcement still requires Supabase acceptance.

`npm run test:e2e` uses Playwright for English/Arabic document language/direction, desktop/mobile viewport fit, category navigation, filters, invalid price ranges, XSS text escaping, guest admin redirects, corrupt cart state and mobile drawer behavior. The 3D PC tests click/tap actual GPU, CPU and SSD mesh surfaces (HTML hotspots are disabled during these checks), distinguish drag rotation from navigation, exercise keyboard rotation/reset, and force WebGL failure to check all eight localized category links. One desktop run of the mobile-only drawer case is intentionally skipped.

The model geometry test checks that every component has a visible, correctly selectable surface in the opening camera view. Confirmation redirect tests cover safe destinations and password recovery. Browser checks also cover the Complete PCs entry and prevent a direct URL/query string from displaying a false verification result. The current local result is 37 unit/database/model tests passed and 31 browser tests passed with one intentional skip. This does not add new marketplace business acceptance.

The same 27 browser checks passed against the redesigned Vercel deployment on 14 October 2026 (one intentional desktop skip). Mobile rotation uses touch events, and mesh selection uses actual taps. Production build and live desktop/mobile/Arabic visual checks passed. Initial selector failures from transient hidden copies in streamed HTML were fixed by waiting for the mounted scene and selecting visible semantic controls.

Set `PLAYWRIGHT_BASE_URL=https://pc-exchange-egypt.vercel.app` to run the same read-only browser suite against the deployment instead of starting a local server.

## Live local infrastructure evidence — 14 October 2026

`node scripts/check-confirmation.mjs` passed the real English and Arabic registration flows against the local frontend and PC-backed Auth service: unconfirmed password login is denied; the actual local-mailbox link leads to Account verified; Continue opens the authenticated account; signing out and reusing the link produces a helpful error. Direct anonymous visits cannot claim verification. This test found and verified a fix for callback query strings missing from the Auth redirect allowlist. Disposable users/messages are removed in cleanup. Set `CONFIRMATION_BASE_URL=https://pc-exchange-egypt.vercel.app` to run the same acceptance against Vercel. Email delivery still uses the private local Mailpit service.

This confirmation acceptance also passed in English and Arabic against Vercel deployment `dpl_AGYcKRdD7oLCA6Joo8f9RbCFG6Yv`, using the real PC-backed Auth service. This proves the deployed confirmation result and session flow; it does not prove external email delivery.

The full deployed browser suite also passed against that deployment: 31 checks with one intentional desktop skip, covering Complete PCs, anonymous confirmation access, the 3D model, storefront navigation and mobile/RTL regressions.

`node scripts/check-backend.mjs` passed 11 checks against the real self-hosted Docker services: gateway key enforcement; inaccessible dashboard/management routes; migrated PostgREST categories and public products; private inventory denial; signup and confirmation-required state; local SMTP/token-hash confirmation and a real JWT; denied customer self-promotion; denied customer photo upload; authorized staff upload/public retrieval/removal; password sign-in/out; and Python health with pricing unavailable. Disposable account, photo and mailbox fixtures were removed.

This adds actual Auth, PostgREST and Storage evidence to the embedded PostgreSQL tests. It does not replace the remaining concurrent stock/payment and business acceptance below. Email delivery is local Mailpit only.

The deployed Vercel site also passed browser acceptance on 14 October 2026: homepage and art interaction; registration through a Vercel server action over the tunnel; confirmation email with the correct Vercel callback; SSR account session; denial of customer administration; logout and password login; Arabic mobile viewport fit and no browser runtime errors. Disposable test accounts and mail were removed. This is evidence for the PC-backed deployment, not hosted Supabase or external SMTP.

Python: run the locked virtual environment's `python -m unittest -v` from `services/api`. Four tests cover the health boundary, service authorization, invalid payloads and refusal to fabricate estimates.

## Commands

Seller controls (15 October 2026): the unit/database suite now contains 79 passing tests. `tests/product-operations.test.ts` includes confirmed-owner authorization, stale actions, pause/resume, sold/relist, recoverable deletion, admin restrictions, current photo/contact prerequisites and preservation of references/review validity.

With the PC backend running and a production frontend on port 3001, set `$env:MARKETPLACE_BASE_URL='http://127.0.0.1:3001'` and run `node scripts/check-marketplace.mjs --seller-only` for focused seller lifecycle acceptance. `--seller --delete-only` adds the existing contact/PDF/review workflow and admin permanent deletion with actual Storage cleanup. `--laptop` additionally checks laptop disclosures. Use the Vercel origin in `MARKETPLACE_BASE_URL` for the same deployed checks. These scripts create confirmed disposable users without external email and clean up their records/files; they never operate on existing user listings.

The seller check verifies visible controls in My listings and the listing editor, a single control group after status changes, public/contact restrictions, confirmed deletion, a separate Deleted view, draft restoration, product-ID search, admin restrictions and Arabic mobile layout. The full review variant also checks PDF access and watermark preservation across seller state changes.

```powershell
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
$env:PLAYWRIGHT_CHANNEL='msedge' # Optional installed Windows browser
npm run test:e2e
```

CI uses installed Chromium instead of Edge. `scripts/preview-screenshots.mjs` captures local desktop, mobile and Arabic screenshots to ignored `.artifacts/previews` for visual inspection.

## Live acceptance still required

- External SMTP delivery, recovery, cross-device confirmation and long-lived session refresh. Basic local signup, confirmation, login and logout have passed.
- Inventory create/edit/publish and decoded photo storage through authenticated SDK calls.
- Anonymous catalog/report reads through PostgREST; denied drafts/private data/role writes with actual JWTs.
- Two concurrent real database connections attempting the same final stock unit; exactly one order must reserve it.
- Simultaneous idempotent retries, stale inventory edits and order completion/cancellation under concurrent requests.
- Customer checkout/history and staff fulfillment/payment review in both languages.
- Inspector evidence, condition consistency, changed hardware invalidation and report expiry.
- Hosted storage limits/policies, rate limiting, CSP, MFA, backups and deployment health checks.

Passing the current suites means the initial foundation passes those checks. It does not mean the full master-brief MVP is accepted or ready to launch.
