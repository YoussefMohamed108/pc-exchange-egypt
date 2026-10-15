# MASTER DEVELOPMENT PROMPT — PC EXCHANGE EGYPT

## ROLE AND OBJECTIVE

You are a senior full-stack software engineer, software architect, UI/UX designer, database engineer, AI/ML engineer, cybersecurity specialist, and technical product manager.

Your task is to design, architect, implement, test, and document a complete, production-oriented web platform named **PC Exchange Egypt**.

PC Exchange Egypt is an Egyptian e-commerce and marketplace platform specializing in buying, selling, exchanging, evaluating, and verifying used computer hardware.

The platform must combine the functionality of:

- A professional e-commerce store.
- A peer-to-peer used computer hardware marketplace.
- An AI-powered hardware price estimation system.
- A hardware verification and benchmark reporting system.
- A PC upgrade and compatibility recommendation engine.
- A trade-in and consignment management system.
- A comprehensive business administration dashboard.
- An analytics and inventory management platform.

The final result must be a functional, visually polished, secure, maintainable, and scalable application suitable for launching a real business in Egypt.

**IMPORTANT: This is not a university project, mockup, proof of concept, or demonstration website. Build it as a real commercial product.**

Do not merely provide explanations or architectural suggestions. Create and modify the actual project files, implement the features, configure the database, write migrations, add tests, and provide deployment instructions.

---

# 1. BUSINESS MODEL

The platform must support three primary business models.

### 1.1 Direct Resale

PC Exchange Egypt purchases used hardware, inspects it, and resells it to customers.

Requirements:

- Company-owned inventory.
- Purchase cost tracking.
- Selling price management.
- Product condition assessment.
- Inventory status management.
- Profit margin calculations.
- Hardware inspection reports.
- Product warranties where applicable.
- Sales and purchase history.
- Return and refund management.

### 1.2 Peer-to-Peer Marketplace

Individual sellers and hardware stores can list used components.

Requirements:

- Seller accounts.
- Seller verification.
- Product listings.
- Buyer and seller communication.
- Listing approval and moderation.
- Seller ratings and reviews.
- Marketplace commissions.
- Dispute management.
- Fraud reporting.
- Transaction tracking.

Marketplace payments must not be assumed to support escrow or automatic seller payouts until a compatible payment provider and its capabilities have been verified.

### 1.3 Trade-in and Consignment

Customers can sell hardware directly to PC Exchange Egypt, exchange it toward an upgrade, or request that the company sell it on their behalf.

Requirements:

- Trade-in request forms.
- Hardware evaluation.
- Estimated purchase offers.
- Offer expiration dates.
- Inspection appointments.
- Revised offers following inspection.
- Customer approval or rejection.
- Trade-in credit tracking.
- Consignment agreements.
- Commission calculations.
- Consignment settlement tracking.

All final trade-in offers must require administrative approval.

---

# 2. TECHNOLOGY STACK

Use a modern, production-ready architecture.

## Frontend

- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- React Hook Form.
- Zod validation.
- TanStack Query where appropriate.
- Recharts for analytics.
- Responsive, accessible UI components.

## Backend

Use a hybrid architecture:

- Next.js server-side functionality for application workflows.
- Python FastAPI for AI pricing, hardware analysis, and advanced analytics.
- Clearly defined REST APIs.
- Pydantic schemas.
- Server-side validation.
- Structured error handling.
- API versioning where appropriate.

## Database and Authentication

Use Supabase:

- PostgreSQL database.
- Supabase Authentication.
- Row Level Security.
- Supabase Storage.
- SQL migrations.
- PostgreSQL indexes.
- Database constraints.
- Secure role-based access control.

## Deployment

- Vercel for the Next.js frontend.
- A suitable container hosting provider for FastAPI.
- Supabase for managed PostgreSQL, authentication, and storage.
- GitHub Actions for continuous integration.

Avoid unnecessary microservices. Keep the architecture understandable and cost-efficient for an early-stage business.

## Development Requirements

- TypeScript strict mode.
- ESLint.
- Prettier.
- Environment variable validation.
- Modular components.
- Reusable utilities.
- Comprehensive README.
- Docker configuration for local development where useful.
- Automated testing.

Never hardcode secrets, API keys, service-role credentials, or payment credentials.

---

# 3. VISUAL IDENTITY AND DESIGN

Create a premium technology-focused visual identity.

## Brand

Name: PC Exchange Egypt

Positioning: A trusted destination for verified used PC hardware in Egypt.

Suggested tagline:

"Upgrade Smarter. Trade with Confidence."

## Design Direction

Use a modern, premium, technology-oriented aesthetic.

Visual characteristics:

- Dark navy and near-black backgrounds.
- Electric blue and cyan accents.
- Clean typography.
- Subtle gradients.
- Refined glass-like surfaces where appropriate.
- Smooth micro-interactions.
- Professional product photography.
- Strong visual hierarchy.
- High-quality dashboard layouts.
- Consistent spacing and border radii.

The interface should feel like a serious technology marketplace, not a generic dropshipping template.

## Color System

Suggested palette:

- Primary background: #080D18
- Secondary background: #111827
- Surface: #172033
- Primary accent: #2563EB
- Secondary accent: #06B6D4
- Primary text: #F8FAFC
- Secondary text: #94A3B8
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444

Ensure accessible color contrast.

## User Experience

Implement:

- Desktop-first quality with excellent mobile responsiveness.
- Responsive navigation.
- Mobile navigation drawer.
- Sticky navigation where appropriate.
- Product skeleton loaders.
- Empty states.
- Loading indicators.
- Toast notifications.
- Accessible forms.
- Confirmation dialogs.
- Helpful validation messages.
- Error boundaries.
- Keyboard navigation.
- Clear feedback for user actions.

Support both English and Arabic.

Arabic must support correct RTL layouts, while English uses LTR.

Use a localization architecture that allows additional languages in the future.

Currency must support Egyptian pounds (EGP).

---

# 4. USER ROLES AND PERMISSIONS

Implement a robust role-based access control system.

Roles:

1. Guest
2. Customer
3. Seller
4. Verified Seller
5. Hardware Inspector
6. Support Agent
7. Administrator
8. Super Administrator

Permissions must be enforced on the server and through database Row Level Security.

Never rely on frontend role checks for security.

Users must not be able to change their own privileged roles.

Administrative privileges must only be granted through trusted server-side operations.

---

# 5. AUTHENTICATION AND ACCOUNT MANAGEMENT

Implement:

- Email and password registration.
- Secure login.
- Email verification.
- Password reset.
- Optional Google OAuth.
- Account profile management.
- Profile images.
- Saved addresses.
- Saved hardware configurations.
- Order history.
- Trade-in history.
- Seller listings.
- Notification preferences.
- Account deletion request workflow.
- Session management.

Profile information may include:

- Full name.
- Username.
- Email.
- Phone number.
- Governorate.
- City.
- Optional delivery address.

Apply appropriate privacy controls to personal information.

---

# 6. E-COMMERCE STOREFRONT

Build a complete shopping experience.

## Homepage

Include:

- Premium hero section.
- Featured products.
- Recently listed hardware.
- Verified hardware collection.
- Trending categories.
- Special offers.
- Trade-in promotion.
- AI price estimator promotion.
- How verification works.
- Customer trust and safety section.
- Seller onboarding section.

## Product Categories

Support:

- Processors.
- Graphics cards.
- Motherboards.
- RAM.
- SSDs.
- HDDs.
- Power supplies.
- PC cases.
- Cooling solutions.
- Monitors.
- Peripherals.
- Complete PC builds.
- Other computer components.

## Product Listing Cards

Each card should display:

- Product image.
- Product title.
- Brand.
- Model.
- Price in EGP.
- Condition.
- Verification status.
- Seller type.
- Warranty information if applicable.
- Location.
- Availability.
- Date listed.

Do not display unverified ratings, discounts, or claims as factual.

## Search and Filtering

Implement:

- Full-text search.
- Category filtering.
- Brand filtering.
- Model filtering.
- Minimum and maximum price.
- Condition filtering.
- Location filtering.
- Verified-only filtering.
- Warranty filtering.
- Availability filtering.
- Sorting by price, date, and relevance.

Search must be efficient and paginated.

---

# 7. PRODUCT DETAILS PAGE

Every product must have a detailed product page.

Include:

- High-quality image gallery.
- Product title.
- Manufacturer and model.
- Technical specifications.
- Product condition.
- Asking price.
- Seller information.
- Verification status.
- Inspection report.
- Benchmark results when available.
- Warranty terms.
- Return policy.
- Shipping options.
- Availability.
- Similar products.
- Compatible components.
- Add to cart.
- Buy now.
- Save to wishlist.
- Contact seller.
- Report listing.

Differentiate clearly between:

- Seller-provided information.
- Automatically extracted technical information.
- Platform-verified information.

Never represent seller-submitted benchmark screenshots as independently verified.

---

# 8. HARDWARE CONDITION AND VERIFICATION SYSTEM

This is a core competitive advantage.

Create a standardized hardware inspection framework.

## Condition Grades

- Grade A: Excellent condition.
- Grade B: Good condition.
- Grade C: Fair condition.
- Grade D: Defective or for parts.

Grades must be based on documented inspection criteria.

## GPU Verification

Support inspection data such as:

- GPU model.
- VRAM capacity.
- GPU-Z information.
- GPU temperature.
- Hotspot temperature where available.
- Memory temperature where available.
- Stress test results.
- Benchmark scores.
- Fan operation.
- Display output functionality.
- Physical damage.
- Artifacts or stability problems.

## CPU Verification

Support:

- CPU identification.
- Core and thread count.
- Clock information.
- Benchmark results.
- Stability test results.
- Thermal behavior.
- Physical condition.
- Socket or pin damage inspection.

## RAM Verification

Support:

- Capacity.
- Speed.
- Timings.
- Memory test results.
- Error count.
- Module identification.

## Storage Verification

Support:

- SMART health indicators.
- Power-on hours.
- Total bytes written when available.
- Reallocated sectors.
- Media errors.
- Temperature.
- Benchmark results.

## Verification Statuses

Use clearly defined statuses:

- Not Inspected.
- Seller-Reported Tests.
- Evidence Submitted.
- Under Review.
- Platform Verified.
- Verification Failed.
- Verification Expired.

A product may only receive the Platform Verified status after an authorized inspector has completed the required process.

## Verification Reports

Generate detailed reports containing:

- Inspection ID.
- Product identification.
- Inspection date.
- Inspector.
- Test results.
- Condition grade.
- Supporting evidence.
- Known defects.
- Verification scope.
- Expiration policy.
- Final decision.

Allow customers to view public verification reports through a unique URL or QR code.

Protect private inspector notes and sensitive information.

---

# 9. AI HARDWARE PRICE ESTIMATOR

Develop a pricing system specialized for the Egyptian used hardware market.

This is one of the most important differentiating features.

## Inputs

- Hardware category.
- Manufacturer.
- Model.
- Specifications.
- Age.
- Condition.
- Warranty status.
- Original packaging availability.
- Verification status.
- Historical listing prices.
- Confirmed historical sale prices.
- Market supply.
- Recent price trends.

## Outputs

Return:

- Estimated market price range.
- Suggested listing price.
- Suggested quick-sale price.
- Confidence level.
- Comparable listings.
- Pricing explanation.
- Data freshness information.

## Pricing Engine Strategy

Implement pricing in stages.

### Stage 1 — Statistical Pricing

Start with:

- Comparable listings.
- Median prices.
- Outlier detection.
- Recency weighting.
- Condition adjustments.
- Warranty adjustments.
- Hardware specification matching.

Distinguish asking prices from confirmed transaction prices.

Do not treat an asking price as a completed sale.

### Stage 2 — Machine Learning

When sufficient quality data exists, introduce:

- CatBoost or XGBoost.
- Feature engineering.
- Temporal validation.
- Model evaluation.
- Prediction interval estimation.
- Model versioning.
- Drift monitoring.

Evaluate the system using appropriate regression metrics such as MAE and RMSE.

Avoid data leakage.

### Stage 3 — Advanced Market Intelligence

Add:

- Price trend analysis.
- Supply and demand indicators.
- Price drop detection.
- Undervalued listing identification.
- Market volatility indicators.

## Data Collection

Only collect market data through authorized methods.

Use:

- Platform transaction records.
- Voluntarily submitted seller data.
- Permitted external APIs.
- Licensed datasets.
- Compliant data partnerships.

Do not implement unauthorized scraping or bypass third-party access restrictions.

## Confidence Handling

When insufficient data exists:

- Show a low-confidence estimate.
- Explain the limitation.
- Offer manual evaluation.
- Avoid inventing prices.

The AI pricing system must never present fabricated market observations.

---

# 10. PC BUILDER AND COMPATIBILITY ENGINE

Create a PC building and upgrade assistant.

## PC Builder

Allow users to select:

- CPU.
- Motherboard.
- GPU.
- RAM.
- Storage.
- PSU.
- Case.
- Cooling solution.

Display:

- Total price.
- Component compatibility.
- Estimated power requirements.
- Available products.
- Missing components.
- Compatibility warnings.

## Compatibility Rules

Validate:

- CPU socket.
- Motherboard chipset and BIOS support.
- RAM generation.
- Motherboard memory support.
- GPU physical clearance.
- Case form factor.
- CPU cooler clearance.
- PSU power capacity.
- PSU connector compatibility.
- Storage interface support.
- PCIe slot availability.

Use a maintainable structured hardware specifications database.

Never assume compatibility from product names alone.

If a required specification is missing, explicitly mark compatibility as unknown.

## Upgrade Recommendations

Users should be able to save their current PC configuration.

The platform should suggest:

- Compatible upgrades.
- Available used hardware.
- Estimated resale value of replaced components.
- Net upgrade cost.
- Potential performance improvements.

Performance estimates must use documented benchmarks and explain uncertainty.

Avoid arbitrary bottleneck percentages.

---

# 11. TRADE-IN SYSTEM

Implement a complete trade-in workflow.

## Customer Workflow

1. Select the hardware category.
2. Enter model and specifications.
3. Describe condition.
4. Upload images.
5. Provide warranty information.
6. Receive preliminary valuation.
7. Submit trade-in request.
8. Choose inspection or delivery method.
9. Receive final offer after inspection.
10. Accept or reject the offer.
11. Complete the transaction.

## Administrative Workflow

Administrators must be able to:

- Review requests.
- Request additional evidence.
- Schedule inspections.
- Record inspection results.
- Adjust offers.
- Approve or reject requests.
- Track settlements.
- Convert accepted hardware into inventory.

Track all state changes in an audit log.

Do not automatically issue financial credits without an approved transaction.

---

# 12. CONSIGNMENT SYSTEM

Allow customers to request that PC Exchange Egypt sell their hardware on their behalf.

Implement:

- Consignment request.
- Product intake.
- Inspection.
- Listing approval.
- Asking price agreement.
- Commission agreement.
- Listing management.
- Sale tracking.
- Settlement calculation.
- Seller payout status.
- Unsold item return workflow.

Commission rates must be configurable by administrators.

Clearly show:

- Selling price.
- Platform commission.
- Other applicable fees.
- Seller net proceeds.

---

# 13. SHOPPING CART AND CHECKOUT

Implement a reliable e-commerce checkout.

Features:

- Persistent cart.
- Guest cart support.
- Cart merging after login.
- Quantity validation.
- Stock availability validation.
- Shipping address.
- Order summary.
- Payment selection.
- Order confirmation.
- Order status tracking.
- Cancellation requests.
- Returns and refunds.

## Payment Methods

Design the system to support:

- Cash on delivery where operationally available.
- Manual bank transfer.
- InstaPay transfer confirmation.
- Vodafone Cash or other mobile wallet transfers.
- Future payment gateway integrations.

Do not assume a payment integration exists.

Use a payment abstraction layer so supported Egyptian payment gateways can be added later.

Manual payments must require authorized verification.

Uploading a transfer screenshot must never automatically mark an order as paid.

Implement idempotent payment processing and secure webhook verification for future gateways.

---

# 14. INVENTORY MANAGEMENT

Build a complete inventory management module.

Track:

- Product SKU.
- Category.
- Brand.
- Model.
- Serial number where appropriate.
- Purchase date.
- Purchase cost.
- Source.
- Condition.
- Inspection status.
- Listing price.
- Sale price.
- Storage location.
- Inventory status.
- Warranty.
- Return history.

Inventory statuses:

- Acquired.
- Awaiting Inspection.
- Under Inspection.
- Ready for Listing.
- Listed.
- Reserved.
- Sold.
- Returned.
- Defective.
- Written Off.

Use transaction-safe inventory reservation logic to prevent overselling.

Store serial numbers securely and avoid exposing complete identifiers publicly.

---

# 15. SELLER DASHBOARD

Build a seller portal containing:

- Active listings.
- Draft listings.
- Sold items.
- Pending approvals.
- Listing views.
- Messages.
- Sales analytics.
- Commission information.
- Payout history.
- Verification requests.
- Account settings.

Allow sellers to create, edit, pause, and archive listings according to their permissions.

---

# 16. ADMINISTRATION DASHBOARD

Create a professional administration interface.

## Overview

Display:

- Total revenue.
- Gross profit.
- Contribution margin.
- Operating profit estimates.
- Total orders.
- Completed sales.
- Active listings.
- Pending inspections.
- Pending trade-in requests.
- Inventory value.
- Average days to sell.
- Return rate.

## Inventory Administration

Support:

- Add products.
- Edit products.
- Bulk import.
- Stock adjustments.
- Purchase cost management.
- Condition management.
- Product approval.
- Inventory history.

## Orders

Support:

- Order review.
- Payment verification.
- Fulfillment.
- Shipping status.
- Cancellations.
- Returns.
- Refunds.

## Users and Sellers

Support:

- Account management.
- Seller verification.
- Moderation.
- Suspensions.
- Disputes.
- Permission management.

## Financial Analytics

Include:

- Revenue over time.
- Cost of goods sold.
- Gross profit.
- Operating expenses.
- Contribution margin.
- Inventory turnover.
- Sales by category.
- Profit by product.
- Unsold inventory aging.
- Commission revenue.
- Trade-in profitability.

Ensure financial metrics have clear definitions.

Do not confuse revenue with profit.

---

# 17. CUSTOMER COMMUNICATION

Implement:

- Buyer-to-seller messaging.
- Product inquiries.
- Order notifications.
- Trade-in status notifications.
- Inspection updates.
- Email notifications.
- Optional future SMS and WhatsApp integration.

Protect users from spam and abusive communication.

Avoid exposing private contact details without permission.

---

# 18. REVIEWS AND REPUTATION

Build a reputation system.

Features:

- Verified purchase reviews.
- Seller ratings.
- Product reviews where appropriate.
- Review moderation.
- Abuse reporting.
- Dispute resolution.
- Seller response functionality.

Only verified transactions should qualify for verified purchase badges.

Prevent duplicate review manipulation.

---

# 19. SHIPPING AND DELIVERY

Design for Egyptian logistics.

Support:

- Egyptian governorates.
- Cities and delivery zones.
- Shipping fee configuration.
- Local pickup.
- Courier delivery.
- Shipment tracking.
- Delivery confirmation.
- Failed delivery handling.

Do not hardcode shipping prices without administrative configuration.

Prepare an integration layer for future logistics providers.

---

# 20. SECURITY REQUIREMENTS

Security must be implemented from the beginning.

Include:

- Supabase Row Level Security.
- Server-side authorization.
- Secure authentication.
- Input validation.
- Output encoding.
- CSRF protection where applicable.
- Rate limiting.
- Secure file uploads.
- File type validation.
- File size restrictions.
- Private storage for sensitive documents.
- Signed URLs for controlled access.
- Audit logging.
- Secure error handling.
- Secret management.
- SQL injection prevention.
- XSS prevention.
- Abuse prevention.
- Dependency vulnerability scanning.

Use the OWASP Top 10 as a security reference.

Never expose Supabase service-role credentials to the browser.

Never trust client-submitted product prices, permissions, inventory values, or payment statuses.

---

# 21. DATABASE DESIGN

Create a normalized PostgreSQL schema.

Suggested entities:

- profiles
- user_roles
- sellers
- seller_verifications
- categories
- brands
- hardware_models
- hardware_specifications
- products
- product_images
- product_condition_reports
- inspection_requests
- inspection_results
- benchmark_results
- inventory_items
- inventory_movements
- carts
- cart_items
- orders
- order_items
- payments
- payment_events
- refunds
- shipping_addresses
- shipments
- trade_in_requests
- trade_in_offers
- consignments
- consignment_settlements
- price_observations
- price_estimates
- saved_pc_builds
- pc_build_components
- compatibility_rules
- wishlists
- conversations
- messages
- reviews
- disputes
- notifications
- expenses
- audit_logs
- platform_settings

These are proposed entities, not a mandatory one-table-per-feature requirement.

Refine and normalize the design as appropriate.

Every table must have suitable:

- Primary keys.
- Foreign keys.
- Constraints.
- Indexes.
- Timestamps.
- Access policies.

Use database transactions for financial and inventory operations.

Store monetary values using exact numeric representations, never floating-point calculations.

Create versioned SQL migrations.

---

# 22. ANALYTICS AND BUSINESS INTELLIGENCE

Build analytics that help the business make purchasing decisions.

Required metrics:

- Average purchase cost.
- Average resale price.
- Realized gross profit.
- Contribution margin.
- Average days to sell.
- Inventory turnover.
- Unsold inventory value.
- Return rate.
- Product category profitability.
- Customer acquisition cost when data is available.
- Repeat purchase rate.
- Revenue by source.
- Commission income.

Create dashboards with date filters and export functionality.

Avoid fabricated analytics. Empty datasets should display appropriate empty states.

---

# 23. SEO AND PERFORMANCE

Implement:

- Server-rendered product pages.
- Product metadata.
- Canonical URLs.
- XML sitemap.
- robots.txt.
- Open Graph metadata.
- Structured data where applicable.
- Optimized images.
- Lazy loading.
- Pagination.
- Caching.
- Database query optimization.
- Mobile performance optimization.

Aim for strong Core Web Vitals.

Use accurate structured data and never fabricate reviews or ratings.

---

# 24. TESTING AND QUALITY ASSURANCE

Create automated tests.

## Unit Tests

Cover:

- Pricing calculations.
- Inventory logic.
- Commission calculations.
- Trade-in calculations.
- Compatibility rules.
- Validation logic.

## Integration Tests

Cover:

- Authentication.
- Product creation.
- Order placement.
- Inventory reservation.
- Payment state transitions.
- Trade-in approval.
- Role permissions.

## End-to-End Tests

Use Playwright.

Test:

- Registration and login.
- Product browsing.
- Search and filters.
- Add to cart.
- Checkout.
- Order tracking.
- Seller listing creation.
- Administrator approval.
- Trade-in request.
- Inspection workflow.

Include tests for unauthorized access and common security failures.

---

# 25. DOCUMENTATION

Create the following documentation:

- README.md
- ARCHITECTURE.md
- DATABASE_SCHEMA.md
- API_DOCUMENTATION.md
- SETUP_GUIDE.md
- DEPLOYMENT_GUIDE.md
- SECURITY.md
- TESTING.md
- BUSINESS_LOGIC.md
- DEVELOPMENT_ROADMAP.md

Include an .env.example file containing placeholder values only.

Provide clear local setup instructions.

Document all external services and required configuration.

---

# 26. IMPLEMENTATION STRATEGY

Do not attempt to build every advanced feature in a single unverified pass.

Implement the project incrementally, while keeping the full architecture in mind.

## Phase 1 — Production-Oriented MVP

Implement first:

1. Project structure and development tooling.
2. Design system and responsive layout.
3. Supabase authentication.
4. User roles and authorization.
5. Database schema and RLS.
6. Product catalog.
7. Search and filtering.
8. Product details.
9. Company-owned inventory.
10. Shopping cart.
11. Checkout with supported manual payment workflows.
12. Order management.
13. Basic admin dashboard.
14. Basic inspection reports.
15. English and Arabic localization.
16. Essential tests and deployment configuration.

The MVP must be usable for real business operations.

## Phase 2 — Marketplace and Trade-in

Implement:

1. Seller onboarding.
2. Seller listings.
3. Listing moderation.
4. Seller dashboard.
5. Buyer and seller messaging.
6. Trade-in workflows.
7. Consignment workflows.
8. Advanced inspection management.
9. Reviews and disputes.

## Phase 3 — Pricing Intelligence

Implement:

1. Price observation database.
2. Statistical pricing engine.
3. Comparable listings.
4. Pricing confidence indicators.
5. Market trend dashboard.
6. Price alerts.
7. Undervalued listing detection.

Only introduce trained ML models when appropriate datasets are available.

## Phase 4 — Advanced Features

Implement:

1. PC builder.
2. Hardware compatibility engine.
3. Upgrade recommendations.
4. Saved PC configurations.
5. Advanced analytics.
6. Automated benchmark report processing where technically feasible.
7. Additional payment integrations.
8. Logistics integrations.
9. ML model training and monitoring.

---

# 27. CODING AGENT EXECUTION INSTRUCTIONS

You are operating as an autonomous coding agent inside a project workspace.

Follow these rules:

1. Inspect the existing repository before making changes.
2. If the repository is empty, initialize the project.
3. Create a clear implementation plan.
4. Build the application in working increments.
5. Write actual production-oriented code.
6. Do not stop after generating documentation.
7. Do not create fake integrations that appear functional.
8. Do not hardcode example business data as real inventory.
9. Do not fabricate prices, transactions, reviews, or verification results.
10. Use clearly labeled development fixtures only where necessary.
11. Implement backend validation for sensitive operations.
12. Apply database migrations safely.
13. Write tests alongside important business logic.
14. Run available tests, linting, and type checking.
15. Fix errors discovered during implementation.
16. Keep the application runnable throughout development.
17. Document decisions and trade-offs.
18. Never expose secrets.
19. Do not deploy, spend money, purchase services, or perform irreversible external actions without explicit authorization.
20. If credentials or external services are unavailable, implement the integration boundary and provide precise setup instructions.
21. Do not claim a feature works unless it has been implemented and appropriately tested.
22. Prioritize correctness, security, maintainability, and user experience over unnecessary complexity.

Maintain a progress file named PROJECT_PROGRESS.md.

After every major implementation milestone, update:

- Completed features.
- Files created or modified.
- Database migrations.
- Tests executed.
- Known issues.
- Remaining work.
- Recommended next steps.

---

# 28. ACCEPTANCE CRITERIA

The MVP is considered complete only when:

- Users can register and authenticate.
- Users can browse and search real database-backed product listings.
- Administrators can manage inventory.
- Product pages display accurate specifications and condition information.
- Customers can add products to a cart.
- Customers can submit orders.
- Inventory is safely reserved or decremented according to the defined order lifecycle.
- Manual payments require authorized verification.
- Administrators can process orders.
- Basic inspection reports can be created and viewed.
- Role-based access restrictions are enforced.
- Arabic and English interfaces function correctly.
- The interface works on desktop and mobile.
- Database policies have been tested.
- Critical workflows have automated test coverage.
- The application builds successfully.
- Deployment instructions are complete.
- No secrets are exposed.
- No mock data is misrepresented as real commercial information.

---

# 29. INITIAL EXECUTION TASK

Begin immediately.

First:

1. Inspect the current workspace.
2. Determine whether an existing application needs to be preserved.
3. Produce a concise architecture and implementation plan.
4. Create the project structure.
5. Configure Next.js, TypeScript, Tailwind CSS, and the UI component system.
6. Set up the Supabase integration architecture.
7. Design the initial database schema and RLS policies.
8. Implement the global layout, navigation, homepage, and product catalog foundation.
9. Create a functional initial admin inventory workflow.
10. Run linting, type checking, and relevant tests.

Then continue implementing Phase 1 in small, verifiable milestones.

Do not wait for confirmation between ordinary coding steps. Ask questions only when a critical business decision, external credential, destructive operation, or financial commitment requires explicit approval.

**The ultimate goal is to create the foundation of a real, trustworthy, commercially viable used computer hardware marketplace for Egypt.**
