# Backend on this PC

The Supabase services and files under `volumes/` derive from the official [Supabase self-hosted/v0.8.2](https://github.com/supabase/supabase/tree/self-hosted/v0.8.2/docker) distribution, licensed under Apache 2.0 (see `SUPABASE-LICENSE`). Image versions are pinned to that release.

Adaptations: project-specific container namespace; named database/photo volumes; gateway bound only to 127.0.0.1:54321; only Auth, REST and Storage routes/clusters; Auth admin endpoints denied at the gateway; request query strings excluded from gateway logs; no Studio, database port, pooler, analytics, functions or Realtime exposure. Unconfigured asymmetric-key matcher entries are removed; fresh random HS256 credentials are used for this installation. Mailpit and email templates support private local email testing. FastAPI listens on loopback port 8000 and is not tunneled.

All private credentials are generated in the ignored `.env` in this directory. The frontend receives only the anon JWT and API URL. Do not share this `.env`, run `docker compose config` in public logs, or publish the database volume. The public API still requires the project's keys and enforces user JWTs and row-level security.

Use `npm run backend:up` to start and migrate, `npm run backend:status` to inspect, and `npm run backend:stop` to stop without deleting volumes. `npm run backend:share` opens a temporary Cloudflare HTTPS tunnel for the API. Restarting a quick tunnel changes its URL: run `npm run deploy:vercel` afterwards to rebuild Vercel with the new URL. For a stable backend address, configure a named Cloudflare tunnel and an owned domain.

Email is captured at http://127.0.0.1:54324 and is not delivered externally. Keep this deployment a testing preview until SMTP, staff accounts and the remaining live acceptance steps are complete. Your PC, Docker, Internet connection and the tunnel must stay running.
