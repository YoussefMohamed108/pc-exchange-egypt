# Deployment

The owner authorized a PC-hosted backend and Vercel frontend on 14 October 2026. The development preview is deployed at [pc-exchange-egypt.vercel.app](https://pc-exchange-egypt.vercel.app/en), with Arabic at `/ar`. This is not full commercial launch acceptance.

## Current topology and restart

Browser → Vercel Next.js/server actions → Cloudflare HTTPS tunnel → loopback API gateway → local Supabase Auth/REST/Storage/PostgreSQL. The gateway also exposes FastAPI's authenticated PDF submission route; other analysis routes stay private. No database port, dashboard, mailbox or privileged Supabase credential is exposed to Vercel or the public tunnel.

Windows automatic startup is installed. Sign in after turning on the PC; the hidden task starts Docker and the installed backend, restores the tunnel, and updates Vercel from its existing production source when the API address changes. See [automatic startup](docs/automatic-startup.md) for status, pause/resume and disable commands. Allow several minutes for the connection rebuild.

For explicit backend code/migration updates and frontend source deployment, run:

```powershell
npm run backend:up
npm run backend:share
npm run deploy:vercel
```

The Cloudflare quick tunnel is temporary. When it restarts, its address changes; the startup supervisor rebuilds the existing Vercel deployment automatically. Your PC must stay awake with Docker, the tunnel and its Internet connection running. For a stable URL, replace the quick tunnel with a named Cloudflare tunnel on an owned domain, update the backend URL and rebuild Vercel. Quick tunnels are for development/testing, as described in [Cloudflare's documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Only `NEXT_PUBLIC_SUPABASE_URL`, the anon key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` and the preview label are sent to Vercel. `.vercelignore` excludes private infrastructure and environment files while retaining `src/lib/supabase`. The application never needs a service-role key.

The canonical origin is already configured in local Auth. To change it, run `node scripts/backend.mjs site https://your-new-origin` before deploying. Sign-in data lives in the local PostgreSQL Docker volume; photos/evidence live in a separate Docker volume. Stopping containers preserves both. Brevo SMTP and the owner's admin account are configured. Backup/restore and commercial order acceptance remain open.

Email confirmation and recovery use SSR-compatible token-hash links and Brevo SMTP. Real owner confirmation delivery and the confirmed Auth state were verified. See [email setup](docs/email-setup.md), including IP allowlist maintenance and key expiry. The UI remains a development preview.

## Moving to hosted Supabase later

Create/select the authorized project. Review migrations and apply them once, in order. Configure Auth site URL, authorized redirects, email confirmation, SMTP/rate limits and staff permissions. Test public/private policies with actual JWTs. Configure pickup operations before taking orders. Keep manual transfer methods disabled until their destination/reconciliation workflow is ready.

## Vercel configuration

Import the repository as a Next.js project, root directory `.`. Build command `npm run build`, Node 24. Set the three frontend variables from `.env.example` in the appropriate preview/production environments. `NEXT_PUBLIC_SITE_URL` must be the canonical deployment origin.

Use separate test data/roles for previews. No service-role key is needed by the application. Never set a privileged key as a `NEXT_PUBLIC_` value. Public values are compiled at build time; rebuild after changing them.

Check `/api/v1/health`, both locale homepages, catalog, Auth callbacks and staff permissions. A successful health endpoint only confirms application health/configuration, not complete database connectivity. Verify real inventory and customer/staff journeys before accepting traffic.

## Next container alternative

The root Dockerfile uses a multi-stage Node 24 build and Next's standalone output. Pass only public environment values as build arguments. Supply matching configuration at runtime. The runner uses an unprivileged user.

```powershell
docker build -t pc-exchange-web --build-arg NEXT_PUBLIC_SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --build-arg NEXT_PUBLIC_SITE_URL .
docker run --rm -p 3000:3000 --env-file .env.local pc-exchange-web
```

Use your platform's secret/environment manager rather than copying `.env.local` into an image. Terminate TLS at the authorized hosting platform. Horizontal instances need a consistent Next server-action encryption key as described in the installed Next documentation.

## Analysis service

The service is optional during Phase 1. Build with `docker build -t pc-exchange-analysis services/api`, run on an authorized container host with port 8000 and a server-only random `PRICING_SERVICE_TOKEN`. The image runs as an unprivileged user. Do not expose the token to browser code.

The contract currently rejects price estimates with `insufficient_market_data`. Its deployment does not enable AI pricing. Add approved data sources, provenance, statistical validation and a server adapter before exposing estimates in the storefront.

## CI and release process

The included GitHub workflow runs lint, types, formatting, domain/SQL tests, build, dependency audit, browser checks and Python boundary tests. Workflow files were created locally; no GitHub repository or remote workflow run was created.

Keep migration backups and a reviewed restore plan. Inventory/order procedures must be verified before rollout. Prefer backward-compatible migrations; do not deploy code referencing schema changes before they are applied. Configure error monitoring and operational alerting before real sales.
