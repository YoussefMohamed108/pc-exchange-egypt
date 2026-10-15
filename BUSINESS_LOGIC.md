# Business rules

## Money

One EGP equals 100 integer piastres. Decimal text is parsed using integer arithmetic; scientific notation, negative values and sub-piastre precision are rejected. The database is authoritative for checkout prices and private unit acquisition costs. Order line items snapshot prices/costs at placement.

## Inventory

`available = stock_on_hand - reserved_quantity`. Stock on hand includes reserved units until a completed sale decrements both. Administrative adjustments cannot reduce stock below reservations. Concurrent form edits require the last loaded product timestamp; stale saves fail atomically.

The initial listing states are `draft`, `listed`, `archived`. Detailed acquisition/inspection/return/write-off transitions and an inventory movement ledger remain MVP expansion work. Audit records currently document every inventory save and order/inspection operation.

## Checkout and orders

1. Authenticate, validate bounded IDs/quantities, mobile number, retry UUID and configured method.
2. Serialize identical retries with an advisory transaction lock.
3. Lock product/inventory rows in UUID order and verify listed status and available stock.
4. Calculate totals from database prices, snapshot lines and reserve stock in the same transaction.
5. Return the order UUID. Retrying the same customer/key never reserves twice.

Administrators move `pending → confirmed → ready → completed`. Completion requires verified payment and decrements reserved/on-hand quantities. Cancellation releases reservations for unpaid orders. Completed/cancelled orders cannot be changed through the initial function. Paid cancellations are refused pending a proper refund workflow.

Up to 10 new orders per customer per hour are permitted by the database function. Reservations do not expire automatically yet; operations must review pending orders and explicitly cancel unpaid abandoned requests. Before launch, implement expiry and customer cancellation requests.

Only local pickup is supported initially. No shipping fee or delivery promise is invented. Operations must confirm actual pickup location and appointment details. Address storage, courier configuration and tracking remain open.

## Payments

Initial enabled method: cash on pickup. Transfer methods are recognized but disabled until operational configuration is ready. A transfer reference is a customer assertion, not proof of receipt. Staff verify received money separately. Only that authorized function records `verified_by` and `verified_at`.

No screenshot automatically triggers payment approval. Private transfer-evidence upload, reconciliation instructions, refunds and gateway webhook adapters remain open. No escrow, payout, trade-in credit or settlement is implemented.

## Verification

Only admins can publish company inspection reports under the current user/admin role model. A report must include scope, findings, at least one recorded test, decision and expiry (1–180 days). Defective grade D cannot pass. Reports preserve product identity and revision; the inspector's condition grade updates the listing and the report snapshots that revision atomically. Seller benchmark review is a separate claim and workflow described in [marketplace architecture](docs/marketplace-architecture.md).

Verification is derived from the latest report, expiration and product revision. Changes to hardware identity, description, condition, specifications or photos invalidate prior verification. Changing price or stock alone does not change the hardware revision. The public report clearly identifies its limited scope; private notes and full account identifiers are excluded.

The initial form records manual tests. Per-category mandatory GPU/CPU/RAM/SMART checklists, evidence attachment and benchmark authenticity checks remain before the complete inspection system is accepted.

## Analytics and future rules

Inventory cost shown in the dashboard is acquisition cost × loaded stock on hand. It is not revenue or profit. Other counters describe loaded inventory/orders, with the 100-record limit disclosed.

Pricing observations, seller commissions, trade-in offers, consignment settlements and compatibility rules belong to subsequent milestones. No numeric market/performance claims are presented in their absence.
