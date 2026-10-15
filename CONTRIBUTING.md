# Working on PC Exchange Egypt

The private repository is the shared source of truth. Read [AGENTS.md](AGENTS.md), [current progress](PROJECT_PROGRESS.md) and [marketplace architecture](docs/marketplace-architecture.md) before changing workflows.

## Local setup

Use Node 24 and `npm ci`. Copy `.env.example` to `.env.local` and run `npm run dev`. Without backend settings the storefront deliberately shows empty/unconfigured states. Use your own local Supabase stack or development backend for authenticated work; [SETUP_GUIDE.md](SETUP_GUIDE.md) covers both options.

The existing owner's PC backend is a deployed environment, not a shared development database. Do not copy its credentials, SMTP key or Docker data into your checkout. `.env*` (except safe `.env.example` files), `.vercel`, `.artifacts`, dependencies and generated output are excluded from Git. Vercel receives public connection settings only. Never put a service-role key in browser code or a `NEXT_PUBLIC_` variable.

## Changes and review

1. Pull `main` and create a short-lived branch. Codex-managed branches use `codex/`.
2. Keep changes focused. Preserve English/Arabic layouts, honest empty states and existing ownership boundaries.
3. Run `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` and `npm run build`.
4. Run browser checks for UI changes: `npx playwright install chromium`, then `npm run test:e2e`. On Windows you may set `PLAYWRIGHT_CHANNEL=msedge` to use installed Edge.
5. Open a pull request describing the behavior, validation and any deployment/migration step. Wait for review and passing checks before merging.

The CI workflow runs static checks, database/unit tests, frontend browser tests and Python API tests. It does not connect to the owner's backend or send verification mail. Full marketplace acceptance is a separate operator-run check using disposable users; see [TESTING.md](TESTING.md).

## Database and file deletion

Add new timestamped files under `supabase/migrations/`. Never edit a migration already applied: the deployment runner verifies checksums. Preserve integer piastres, row locks and server/SQL authorization. Apply changes to an isolated database first, then coordinate deployment with the owner.

Permanent deletion requires confirmed ownership or administrator authorization, the exact PCX reference and explicit confirmation. Shared photos and company order history must remain protected. File cleanup uses a durable, authorized queue; do not delete `storage.objects` directly in application code.

## Deployment

Repository access does not grant production access. The owner coordinates database migrations and Vercel releases. The project currently deploys through `npm run deploy:vercel`; GitHub pushes are not automatically connected to Vercel. Do not register startup tasks or expose a tunnel from a collaborator's machine merely to run frontend tests.

Do not add sample listings, benchmark estimates or inspection claims to deployed data. Preserve source attribution for benchmark measurements. The repository has no public open-source license.
