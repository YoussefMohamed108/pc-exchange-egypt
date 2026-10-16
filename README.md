# PC Exchange Egypt

A bilingual used PC hardware storefront and operations application for Egypt. The first implementation follows the supplied [master brief](docs/MASTER_BRIEF.md).

**Status: deployed to [pc-ex.store](https://pc-ex.store/en) on Vercel, backed by self-hosted Supabase and FastAPI on the owner's PC.** The interactive 3D PC storefront supports English and Arabic. Full business launch acceptance remains open. The app never creates fictional commercial inventory, pricing, sales or inspection results.

The public repository is [YoussefMohamed108/pc-exchange-egypt](https://github.com/YoussefMohamed108/pc-exchange-egypt). New collaborators should start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [pull-request/production workflow](docs/github-vercel-workflow.md). Use an isolated development backend and your own ignored environment files. The owner's Windows startup task starts the deployed Docker backend/tunnel at sign-in; see [automatic startup](docs/automatic-startup.md). Operator controls and deployment instructions are in [SETUP_GUIDE.md](SETUP_GUIDE.md) and [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Start locally

Use Node 24, matching CI and the deployed application.

```powershell
npm ci
npm run dev
```

Open [the English storefront](http://127.0.0.1:3000/en) or [Arabic](http://127.0.0.1:3000/ar). For accounts and real inventory, follow [SETUP_GUIDE.md](SETUP_GUIDE.md) to connect Supabase, apply migrations and assign authorized staff roles.

```powershell
Copy-Item .env.example .env.local
# Enter your project URL, publishable key and canonical site URL in .env.local.
```

## Implemented

- User/admin accounts; every user can buy and sell. Immediate seller publication, required contacts, signed-in buyer contact pages, Complete PCs and Laptops, optional benchmark PDFs and manual admin review. Only approved current evidence displays **Benchmark reviewed**. See [marketplace architecture](docs/marketplace-architecture.md).
- Seller pause/resume, sold/relist, recoverable delete/restore and permanent deletion with typed product-ID confirmation. Admins retain product-ID lookup, moderation, watermark revocation, protected company-order history and audited deletion.
- Independent benchmark-review and physical-inspection queues. Free physical inspection requests, visit reports and a distinct **PCX Inspected** watermark.
- Sourced hardware reference measurements and GPU/CPU gaming FPS, with explicit settings, dates, missing results and links to the original sources.

- Custom Three.js cutaway PC with eight clickable component categories, drag rotation, keyboard controls and a WebGL fallback. Warm paper, charcoal, vermilion and lavender visual identity, self-hosted Archivo/Manrope/Cairo fonts, and English/Arabic RTL layouts.
- Server-rendered catalog, indexed full-text search, category/brand/condition/price/location/verification/warranty/availability filters and pagination.
- Product pages, actual specifications, condition grades, linked public inspection reports and accurate structured data.
- Supabase SSR login, registration, email confirmation, password reset and sign-out boundaries; protected account pages.
- Administrator inventory creation/editing/publication, exact purchase costs, optimistic concurrency and audited stock changes.
- Secure photo uploads: owner/administrator authorization, size limits, image decoding, metadata removal and WebP normalization.
- Browser-persistent cart and authenticated pickup checkout. Database prices, stock locks and idempotency control orders.
- Customer order history and item details; administrator confirmation, payment verification, pickup readiness, completion and unpaid cancellation.
- Administrator report publication with test records, public scope, expiration and invalidation after hardware changes.
- Versioned SQL migrations, explicit grants and RLS; automated domain/database/browser tests and CI configuration.
- Separate tested FastAPI service contract. Pricing correctly returns unavailable until its data and engine exist.

Cash on pickup is the only payment method enabled initially. Transfer references and staff verification are implemented; transfer methods must be enabled by an operator after real destination details and procedures are configured. No gateway, escrow, automatic credit or payout is assumed.

## Checks

```powershell
npm run lint
npm run check:repository
npm run typecheck
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

On Windows, the installed Edge browser can be used without downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

The browser suite supports real inventory, the configured empty storefront and its unconfigured state. Local Auth/REST/Storage acceptance is available with `node scripts/check-backend.mjs`; it creates and cleans up disposable test fixtures. Complete business journeys still require acceptance. See [TESTING.md](TESTING.md) for evidence and boundaries.

## Analysis service

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.lock.txt
cd services/api
..\..\.venv\Scripts\python.exe -m unittest -v
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

This is an integration boundary, not an implemented pricing engine. The website displays that limitation explicitly.

## Documentation

| Document                                         | Purpose                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md)               | Modules and trust boundaries                     |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)         | Tables, views, grants and migrations             |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md)     | Actions, database functions and service contract |
| [SETUP_GUIDE.md](SETUP_GUIDE.md)                 | Local and Supabase configuration                 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)       | Vercel/container deployment steps                |
| [SECURITY.md](SECURITY.md)                       | Security controls and launch requirements        |
| [TESTING.md](TESTING.md)                         | Verification and live-test checklist             |
| [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md)           | Inventory, order and payment invariants          |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Remaining MVP work and later phases              |
| [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)       | Current implementation record                    |

The GitHub repository is private. Production deployment remains an owner-controlled operation; pushing source does not automatically change the PC backend or Vercel site.
