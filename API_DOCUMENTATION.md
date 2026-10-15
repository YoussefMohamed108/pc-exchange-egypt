# API and application contracts

## Seller marketplace contracts

- Server actions in `src/app/actions/marketplace.ts` validate account, role and inputs for contact setup, listing saves, photo upload, PDF submission, review and moderation.
- Authenticated SQL RPCs: `save_contact(data)`, `save_marketplace_listing(data)`, `seller_contact(lid)`, `review_benchmark(sid, decision, note)`, `moderate_listing(lid, hide, reason)`. Role, ownership, confirmation and stale revision rules are rechecked in SQL.
- `POST /evidence/v1/submit/{listing_id}?revision=N` through the PC gateway accepts raw `application/pdf`, with the public application key and a confirmed owner's bearer session. Input and processed output are limited to 3 MB / 12 pages. The PC processor alone invokes privileged `submit_benchmark` after storage upload; ordinary users cannot call it.
- `GET /[locale]/evidence/[id]` streams an authorized PDF with private/no-store headers. Anonymous callers sign in; row and storage policies control access. All signed-in users may see current-revision evidence of visible published listings, including pending evidence.
- `/[locale]/listings/[id]/contact` returns the seller's chosen contacts only after authentication and SQL authorization. It creates no order or reservation.
- `marketplace_catalog` and `all_catalog_products` expose public listings and derived review labels without contact details or PDF paths. See [architecture](docs/marketplace-architecture.md).

## Public HTTP endpoints

`GET /api/v1/health` returns application status, version and a `database_configured` flag. The flag reports configuration, not a database connectivity probe. No secrets or connection values are returned.

`GET /auth/callback` exchanges a Supabase PKCE `code` for a cookie session. `locale` is restricted to `en`/`ar`; `next` is restricted to a local locale route. Invalid confirmation returns to the localized auth screen.

`GET /auth/confirm` verifies supported one-time `token_hash` and `type` values (`signup`, `recovery`, `email`, `email_change`). Recovery defaults to the localized new-password screen.

## Email templates

For robust cross-device confirmation, use a custom token-hash link with your configured `RedirectTo`:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

Use `type=recovery` for the recovery template. The callback supports token hashes as well as PKCE codes, preserving the locale and safe return path. Explicit `/auth/confirm?locale=en` or `locale=ar` links also work when their template supplies the token hash and type.

## Server actions

Next server actions are validated application POST endpoints, not a general third-party REST API. They keep SDK/database implementation on the server. Each mutation rechecks the authenticated identity and role.

| Action             | Input                                                                  | Authorization                    |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------- |
| authenticate       | locale, auth mode, email/password/name                                 | Public; Supabase rate limits     |
| saveInventory      | Strict listing/cost/stock fields; prior timestamp on edit              | Administrator                    |
| uploadProductPhoto | One JPEG/PNG/WebP File <= 5 MB                                         | Administrator                    |
| publishInspection  | Product, scope, findings, at least one test, grade, decision, validity | Hardware inspector               |
| loadCart           | Up to 30 UUIDs                                                         | Public safe products/config only |
| checkout           | Product IDs/quantities, phone, payment method, UUID retry key          | Authenticated customer           |
| processOrder       | UUID and allowed lifecycle action                                      | Administrator                    |
| submitReference    | Owned order UUID and transfer reference                                | Order owner                      |

Errors are shaped for localized user feedback. Internal database codes are logged selectively; credentials, passwords, references and full customer payloads are not logged by application actions.

## PostgreSQL RPC

- `save_inventory(data jsonb) -> uuid`: atomic listing/inventory mutation, required role, optimistic timestamp, stock constraints and audit record.
- `publish_inspection(data jsonb) -> uuid`: inspector-only immutable report with product snapshot and current hardware revision.
- `place_order(p_items jsonb,p_payment_method text,p_phone text,p_idempotency_key uuid) -> uuid`: server prices, bounded payload, per-account order limit, ordered stock locks and atomic reservation. Same user/key returns the original order.
- `submit_payment_reference(p_order_id uuid,p_reference text) -> void`: owned active transfer order; creates only `submitted` state.
- `process_order(p_order_id uuid,p_action text) -> void`: `confirm`, `ready`, `verify_payment`, `complete`, `cancel`, with lifecycle requirements enforced in PostgreSQL.

Functions reject unauthorized invocation even when called directly through Supabase. Their direct HTTP access uses Supabase's authenticated RPC endpoints and RLS-enabled data API.

## FastAPI boundary

- `GET /v1/health`: typed health result with `pricing_available=false`.
- `POST /v1/price-estimates`: private service bearer token, validated category/manufacturer/model/condition/age/warranty body.
- Missing token configuration: HTTP 503 `service_not_configured`.
- Invalid/missing bearer token: HTTP 401 `unauthorized`.
- Invalid body: HTTP 422.
- Valid authorized request: HTTP 503 `insufficient_market_data`. No estimate, observations or confidence values are invented.

OpenAPI is available at `/openapi.json` and interactive docs at `/docs`. This endpoint is a future integration contract; no statistical or ML pricing engine has been implemented.
