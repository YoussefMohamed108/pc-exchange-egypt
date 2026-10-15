# Setup

## Current PC backend and Vercel preview

The project now uses `infrastructure/backend/compose.yaml`, with PostgreSQL 17, Supabase Auth/PostgREST/Storage, a private email mailbox and the Python API. This is separate from the Supabase CLI development stack below; do not start both on the same ports.

Start Docker Desktop's Linux engine, then:

```powershell
npm run backend:up
npm run backend:share
npm run deploy:vercel
```

The first command preserves existing private credentials and Docker volumes, checks migration checksums and applies only unapplied migrations. The second reuses a healthy running tunnel or creates a temporary HTTPS address. The third publishes only allowlisted public connection variables and rebuilds Vercel. The Vercel CLI must be signed in. This PC is already linked to the `pc-exchange-egypt` project.

`npm run backend:status` shows services. `npm run backend:stop` stops the tunnel and containers while preserving data. Do not use `docker compose down -v`: that deletes persistent volumes. Back up the database and storage before moving or upgrading this installation.

Local endpoints: API `http://127.0.0.1:54321`, email mailbox `http://127.0.0.1:54324`, analysis health `http://127.0.0.1:8000/v1/health`. PostgreSQL is accessible only inside the Docker network. Studio is not installed. Application administration remains in the protected frontend.

External email is now configured through Brevo; see `docs/email-setup.md`. Mailpit remains for explicitly isolated tests. The owner explicitly authorized administrator access for their confirmed account. For future role assignments, use a verified UUID and the SQL below through `docker compose -f infrastructure/backend/compose.yaml exec db psql -U postgres -d postgres`.

Credentials live in the ignored `infrastructure/backend/.env`. Do not overwrite or share it. `.env.local` contains only public backend connection values plus local frontend configuration. See [infrastructure/backend/UPSTREAM.md](infrastructure/backend/UPSTREAM.md) for the service boundary.

## Frontend

In the project root, use Node 24 and `npm ci`, then `npm run dev`. Credentials are optional for viewing the empty storefront. Accounts and mutations are explicitly unavailable until Supabase is configured.

For a fresh setup without generated configuration, copy `.env.example` to `.env.local`. Do not overwrite the configured file on this PC. Set:

- `NEXT_PUBLIC_SUPABASE_URL`: your project's HTTP(S) URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key, or legacy anon key. Never use a secret/service-role key.
- `NEXT_PUBLIC_SITE_URL`: canonical browser URL, including the correct port. Development defaults to `http://localhost:3000`.

Restart Next after changing environment configuration. Use the same browser hostname during authentication as the configured site URL, to keep PKCE cookies available.

## Supabase

Use an existing authorized Supabase project or a local Supabase stack. Remote project creation and paid services require the owner's decision.

For an isolated alternative development environment, start Docker Desktop's Linux engine, then:

```powershell
npx supabase start
npx supabase migration up --local
```

The CLI prints local connection values. Put only its API URL and public/anon key in `.env.local`. Local Studio is normally at port 54323. Check `npx supabase status` for actual ports. Do not use `db reset` against data you want to preserve. Do not expose this development stack through a public tunnel; use the self-hosted setup above with unique credentials.

For a new hosted database, review and apply every migration in `supabase/migrations/` in filename order using your authorized migration workflow. Storage migrations require Supabase's managed `storage` schema; Auth migrations require `auth.users` and `auth.uid()`.

Migration 1 is not safe to re-execute after it succeeds; use migration version tracking. It creates named types, tables, views and policies without destructive drops.

## Authentication

Enable email/password registration and email confirmations. Set the Supabase Auth site URL and allow these redirect paths for your actual local/production origins:

- `/auth/callback`
- `/auth/confirm`

Registration, recovery and login are implemented. The default email confirmation link uses the PKCE callback. For confirmation in a different browser/device, configure token-hash email links that preserve `RedirectTo`, as described in API_DOCUMENTATION.md. Configure reliable SMTP and Supabase auth rate limits before launch. Google OAuth remains optional future configuration.

## Staff roles

Register and verify your staff account first. In a trusted SQL editor, inspect the correct `auth.users.id`, then explicitly grant its role:

```sql
update public.account_roles set role='admin'
where user_id='REPLACE_WITH_VERIFIED_STAFF_UUID'::uuid;
-- Record the assignment and its authorization in audit_logs.
```

The active roles are user/admin. Admins manage inventory, inspections and benchmark review. Legacy user_roles no longer grant active privileges. Signup metadata cannot grant roles. Revoke admin by setting role back to user through trusted SQL, with an audit record.

## Initial inventory

Sign in and open `/en/admin` or `/ar/admin`. Record actual SKU, model, condition, cost, stock and specifications. Upload photographs through the form. Save as draft until intake is complete. Publish with `Listed` when ready. Authorized inspectors can publish documented tests through `/admin/inspections`; only listed products have public report URLs.

No example business data is automatically inserted. The interactive PC model is navigation artwork, not an inventory item.

## Payment configuration

Only cash on pickup is initially enabled. Before enabling transfers, document real bank/wallet destination details, staff reconciliation and customer instructions. The UI currently accepts a reference for review; it has no gateway or transfer-instruction management screen. Enable supported methods through trusted configuration only when those operational pieces are ready:

```sql
update public.platform_settings
set value='["cash_on_pickup","bank_transfer","instapay","mobile_wallet"]'::jsonb,
    updated_at=now()
where key='payment_methods';
```

The order function rejects disabled methods regardless of client UI. A submitted reference never marks an order paid.

## Optional analysis service

Create a project-local Python environment and install `services/api/requirements.lock.txt`. Run `python -m uvicorn app.main:app` from `services/api`. `/v1/health` reports that pricing is unavailable. Set a random private `PRICING_SERVICE_TOKEN` of at least 32 characters only in server environment configuration. No frontend key is needed. The price endpoint remains unavailable until actual authorized observations and a pricing engine are implemented.

## Initial environment findings

Node, npm, Python and Docker CLI were installed. Docker's Linux daemon was stopped and the Supabase CLI was not installed globally. No Supabase project credentials were supplied, so live migration/auth/storage acceptance was not executed in this initial session.
