# Database schema

Migrations are ordered and versioned:

1. `supabase/migrations/202610130001_foundation.sql`: application tables, indexes, views, RLS and functions.
2. `supabase/migrations/202610130002_storage.sql`: constrained public product-photo bucket and staff-only storage writes.
3. `supabase/migrations/20261014184519_marketplace_benchmark_review.sql`: active user/admin roles, contact profiles, seller listings, benchmark submissions, safe catalog projections and evidence/photo storage policies. Legacy `user_roles` rows are historical; active authorization uses `account_roles`. See [current marketplace boundaries](docs/marketplace-architecture.md).

No products, transactions or reports are seeded. Static category labels and the cash-on-pickup setting are configuration, not commercial observations.

| Entity                   | Purpose                                                | Access                                          |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| profiles                 | Minimal account name                                   | Owner; administrator read                       |
| user_roles               | Trusted role assignments                               | Owner/admin read; trusted SQL writes            |
| categories               | English/Arabic taxonomy                                | Public read                                     |
| products                 | Company-owned listing data and hardware revision       | Admin/inspector read; inventory function writes |
| inventory_items          | SKU, exact costs, quantities, private serial/location  | Admin read; transaction functions write         |
| inspection_reports       | Immutable decision, tests, scope and identity snapshot | Staff read; inspector function creates          |
| inspection_private_notes | Sensitive inspector notes boundary                     | Inspectors read; no application write UI yet    |
| orders                   | Owner, lifecycle, payment review and idempotency       | Owner/admin read; functions write               |
| order_items              | Snapshotted unit sale price and private cost           | Admin read; checkout inserts                    |
| platform_settings        | Enabled payment methods                                | Public payment-method configuration only        |
| audit_logs               | Actor, action, entity and timestamp                    | Admin read; functions insert                    |

All application tables enable RLS. Direct application writes are revoked, except an owner's `profiles.full_name` update. This prevents callers from bypassing sensitive procedures. Delete policies are absent intentionally.

## Safe projections

- `public_products`: explicit listed-only projection including available quantity and derived verification. No purchase costs, full serials, reserved quantities or user information.
- `public_inspection_reports`: reports for currently listed products; no private notes or inspector account IDs. Historical reports indicate whether their hardware revision is current.
- `customer_order_items`: unit sale prices and quantities for the authenticated owner or administrator. Private unit costs are excluded.

These owner-executed views deliberately filter their publication/ownership scope. They are marked `security_barrier` and tested under guest/customer roles. Do not replace them with `select *` or broaden their grants.

## Integrity and queries

Amounts are `bigint` piastres, bounded to 2,000,000,000 per unit and order. Quantities have nonnegative/check constraints, including `reserved_quantity <= stock_on_hand`. SKU and listing slug are unique. Orders have a unique `(user_id,idempotency_key)`.

A stored search document has a GIN index. Other indexes cover listing status/category/date/price, owner orders, processing queues, inspection recency and audit entities. Foreign keys preserve order/product provenance; commercial history is not cascade-deleted with listings.

`hardware_revision` increments when material listing information changes. Reports snapshot that revision. A previously passing report cannot keep a verification badge after those changes.

Schema definitions are authoritative in SQL. `src/lib/database.types.ts` is a focused hand-maintained contract for used tables/views/functions; replace it with generated Supabase types when a local or hosted project is configured, then rerun type checking.
