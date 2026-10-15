# Interactive PC storefront

Requested change: replace the decorative GPU illustration with a whole, clickable 3D PC, and make the storefront's visual identity more distinctive. The user requested implementation and earlier authorized Vercel deployment.

Use a custom procedural Three.js cutaway tower, with eight independently selectable component groups: graphics card, processor, motherboard, RAM, storage, cooling, power supply and case. Mesh picking navigates to the existing localized category URL. Dragging rotates without navigating. Projected labels and normal category links provide touch/keyboard access. Rotation/reset controls are accessible. Lazy-load the renderer; render on interaction rather than running an idle animation loop. Dispose GPU resources and offer a useful category fallback if WebGL fails.

Art direction: warm paper, charcoal, vermilion and restrained lavender/chartreuse accents; large Archivo display typography and Manrope body type. Use open editorial layouts, a large unboxed PC, component labels and oversized chapter typography. Keep all commercial data and empty states honest; the model is a category navigator, not an in-stock build or compatibility recommendation.

Implementation: shared component/category metadata, procedural model builder, browser renderer, React explorer, new homepage sections and shared storefront theme. Preserve bilingual RTL, existing catalog URLs, auth, checkout and server privileges.

Acceptance: production build/lint/types; actual GPU and CPU mesh clicks; drag without navigation; all eight link destinations; keyboard controls; mobile and Arabic viewport fit; WebGL failure fallback; visual inspection; deployed smoke check. No database migrations are needed.
