# Listing approval and domain transition implementation plan

> Execute with subagent-driven-development for independent implementation tasks; review the complete integration before release.

**Goal:** Require admin approval before seller publication, preserve separate evidence decisions, and complete the pc-ex.store account/email transition.

**Architecture:** A database guard enforces the publication gate across existing mutations. Separate listing review history and queue serve English/Arabic admin and seller interfaces. Deployment/Auth/provider settings complete the domain transition.

**Tech Stack:** Next.js 16.4 / React 19.3, TypeScript, Supabase PostgreSQL 17, FastAPI, Docker, Brevo, GoDaddy DNS, Vercel and GitHub.

## Global constraints

- Follow the approved design in ../specs/2026-10-16-listing-approval-domain-email-design.md.
- Never invent approval/evidence, expose privileged keys, seed real inventory, purchase services, or bypass branch protections.
- Public availability is `listed` only after current-content approval. Benchmark review and physical inspection never imply listing approval.
- Preserve seller pause/sold/delete, admin restrictions, stale timestamp checks and all permanent product references.
- Primary URL is https://pc-ex.store; production credentials never enter previews.

## Task 1 — SQL and evidence boundaries

Files: supabase/migrations/20261016172711_listing_approval.sql; tests/marketplace.test.ts; tests/product-operations.test.ts; new tests/listing-review.test.ts; services/api/app/evidence.py and its existing tests.

- [ ] Write failing isolated PGlite tests for submission invisibility, required refusal reasons, role restrictions, stale review, review history, price-only approval preservation, substantial edit reset, resume/relist bypass prevention and independent benchmark review.
- [ ] Implement the schema/guard/history and `review_listing` / `admin_listing_review_queue` contracts from the design. Existing seller listings enter review; do not backfill approvals.
- [ ] Permit authenticated owned evidence upload while pending/draft without exposing it to buyers; preserve authoritative commit checks and latest-revision review.
- [ ] Adapt existing test fixtures to explicitly approve listings when those tests need public inventory.
- [ ] Run `npx vitest run tests/listing-review.test.ts tests/marketplace.test.ts tests/product-operations.test.ts` and the Python unittest suite.

Example acceptance boundary:

```sql
select public.review_listing(:lid, :updated_at, 'rejected', 'Photos do not show the actual device.');
-- Seller reads this reason; anon sees no listing/contact/evidence.
```

## Task 2 — Listing review interfaces

Files: src/lib/marketplace-validation.ts, database.types.ts, listing-status.ts; new src/app/actions/listing-reviews.ts, src/components/listing-review.tsx, src/app/[locale]/admin/listings/page.tsx; existing seller workspace, listing form, admin sidebar and product workspace.

- [ ] Add RPC/types matching Task 1. Seller forms keep `listed` submission intent; show pending/refusal state separately.
- [ ] Add a guarded review action using `requireStaff`, Zod decision/note/stamp validation and both-locale revalidation.
- [ ] Add an admin queue with reference search, status filter, pagination and direct review/product links. Show photos/details, separate benchmark link and explicit independent decisions.
- [ ] Show sellers latest reason and historical decisions; allow PDF submission before publication, preserve existing controls and localized copy.
- [ ] Remove immediate-publication claims from current UI and documentation. Run lint/typecheck and relevant browser checks.

## Task 3 — Domain/Auth/email configuration

Files: scripts/backend.mjs, scripts/deploy-vercel.mjs, infrastructure/backend/compose.yaml and mail templates as needed; ignored local environment; docs/marketplace-architecture.md and deployment documentation.

- [ ] Inspect current provider sessions, authoritative DNS and project domain/environment configuration without exposing credentials.
- [ ] Configure primary apex, permanent www redirect, SITE_URL / callback allowlist / canonical environment, and verify sitemap and auth links.
- [ ] Authenticate pc-ex.store in Brevo, configure accounts sender and support forwarding to the explicitly authorized inbox. Verify actual DNS and inbound/outbound delivery.
- [ ] Keep existing working SMTP active until branded sender authentication is confirmed; report provider blockers precisely.

## Task 4 — Integration and release

- [ ] Review combined diff against the approved design and fix authorization/state/UX gaps.
- [ ] Run repository/static/unit/Python/build checks and focused disposable local-backend acceptance. Record local versus live evidence accurately.
- [ ] Apply the verified migration and evidence-service update to the PC backend; preserve existing rows/files.
- [ ] Push a feature PR, attach it to the chat, wait for CI and preview, obtain the authorized AI-assisted secondary-account review, merge without bypass and verify production gates.
- [ ] Verify new-domain English/Arabic pages, canonicals/sitemap, redirects, login/confirmation/reset behavior and SMTP identity. Update PROJECT_PROGRESS.md with completed and blocked work.
