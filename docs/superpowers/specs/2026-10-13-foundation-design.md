# PC Exchange Egypt — Phase 1 foundation

The supplied master brief is the governing product specification. The workspace was empty on 13 October 2026. Its instruction to begin implementation without confirmation takes precedence over skill review gates. No deployment or paid services are authorized.

Use a modular Next.js App Router application with strict TypeScript, Tailwind 4, shadcn-compatible primitives and Supabase SSR cookies. English and Arabic have explicit locale routes with correct document direction. Server rendered public catalog pages query a sanitized database view; privileged costs, serial numbers and inspector notes remain in separate protected tables.

PostgreSQL owns authorization and transactional business invariants. Users receive only the customer role at registration. Roles cannot be self-assigned. Inventory changes, checkout and payment transitions use narrowly granted authenticated functions. Orders use integer piastres, lock stock, take prices from the database, and accept an idempotency key. Administrative payment approval is separate from customer submission. Inspectors alone publish verification decisions.

Start with responsive navigation, an editorial hardware hero, searchable category catalog, product details, cart, account screens, inventory administration, order management and basic public inspection reports. Without Supabase configuration, render empty states and disable mutations; never insert commercial fixtures automatically. Future pricing, trade-in and compatibility features are documented as later phases and must never produce invented results.

Test validation and money handling using Vitest, and execute the SQL migration against embedded PostgreSQL with authenticated role simulations. Playwright checks English/Arabic, filters, navigation and protected admin behavior. Live Supabase auth, concurrent database checkout, email delivery and hosted deployment need explicit environment configuration before launch acceptance.
