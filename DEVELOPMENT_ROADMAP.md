# Development roadmap

The full master brief spans four phases. This initial implementation creates Phase 1's storefront and critical database foundation; it is not the entire production MVP.

## Finish Phase 1

1. Configure a real/local Supabase project and execute the live acceptance suite, including multi-connection inventory races and real session refresh.
2. Add server-backed account carts/guest merging, saved addresses, profiles/preferences and account deletion requests.
3. Add customer cancellation requests, reservation expiry, returns/refunds and complete financial/inventory movement history.
4. Configure actual pickup/transfer instructions, delivery zones and admin shipping fees. Add private payment evidence and reconciliation records.
5. Expand category-specific mandatory inspection checklists, evidence files and benchmark scope handling.
6. Add scalable admin pagination, complete inventory intake/status transitions, serial tracking UI, imports and accurate whole-dataset financial analytics/exports.
7. Complete image gallery interaction, wishlist, support contact/return request routes and notifications. Arabic copy is implemented; localized machine statuses/errors and regional input testing need expansion.
8. Add durable email delivery, monitoring, staff MFA, abuse controls, backup/restore tests, full Auth/storage E2E and performance/accessibility release checks.

## Phase 2: Marketplace and trade-in

Seller onboarding, verification and ownership; moderated listings and seller dashboard; protected buyer/seller messaging; inspected trade-in requests with admin-approved offers and expiry; consignment agreements, configured commissions and settlement tracking; verified-purchase reviews, reporting and disputes.

Keep financial settlement and offer approval in database transactions. Verify provider capabilities before assuming escrow or automatic payouts.

## Phase 3: Pricing intelligence

Observation provenance and licensed/authorized collection; asking-price versus confirmed-sale records; specification matching, robust medians, outlier and recency handling; calibrated intervals, freshness and confidence; comparable listings and trend/alert reporting.

Only train CatBoost/XGBoost once enough quality observations exist. Use temporal validation and documented MAE/RMSE with leakage checks. The current service deliberately produces no market estimates.

## Phase 4: Compatibility and advanced operations

Structured manufacturer specifications and evidence sources; socket/BIOS/RAM/clearance/connectors/power/storage compatibility; explicit unknowns for missing data; saved builds and evidence-based upgrade suggestions; advanced analytics; benchmark processing; confirmed gateway/webhook and logistics integrations; pricing model version/drift monitoring.
