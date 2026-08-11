# 49grams Working Memory

This file defines how we work on this project.

## Core Operating Rules

1. Build conversationally: keep scope small, ship in increments, add features only when needed.
2. Do not build "just in case" features without explicit confirmation.
3. Keep responses brief (not frugal), clear, and action-oriented.
4. Be proactive with hints and suggestions, then ask if the user wants to elaborate.
5. Keep costs low across the stack and delivery pipeline.
6. Push only when needed to avoid unnecessary pipeline/runtime costs.
7. If something additional should be tackled, ask first and wait for confirmation.
8. Default to simple implementation over over-engineering.
9. Design and build mobile-first. The site must be responsive from the beginning, with mobile treated as a primary shopping experience rather than an afterthought.
10. End task updates with a visual status marker: green checkmark for completed/passing work, question mark emoji when waiting on a user decision, and a red stop/dot marker for blocked or failed work.

## Product Direction Snapshot

1. Brand: 49grams, curated design-led ecommerce under 49g.
2. Positioning: desire-driven, useful, beautiful, lightweight objects.
3. Launch model: low-stock hybrid inventory, global shipping from UK.
4. Launch SKU target: 20 products.
5. Price focus: primarily GBP 20-40 range.
6. Merchandising priority: use-case-first browsing with weight always visible.
7. Weight rule: only products up to 49g.
8. Content workflow: start from brand assets; add editorial product copy in brand tone.
9. Visual inspiration: Andrew Neyer-style product-first catalogue energy, adapted into a tighter, more premium 49grams system.
10. Typography direction: Peace Sans for the wordmark/logo when available, Space Grotesk for body, titles, UI, and product surfaces.
11. Theme direction: editable design tokens from the admin, starting with primary, secondary, accent, background, brand font, and body font.
12. Border rule: use strong borders only for real structural breaks and framed controls. If a boundary is not carrying structural meaning, prefer spacing and alignment over faint divider lines. Image/media frames can stay subtle; section breaks, drawer edges, and major panel edges should be deliberate.

## Build Philosophy

1. Start with a simple internal catalog manager.
2. Do not over-engineer v1.
3. Add operational/admin capabilities progressively as real needs appear.

## Catalogue Manager Direction

1. Product creation supports both manual entry and assisted URL fetch.
2. URL fetch produces a draft preview; it should never autopublish.
3. AI copy generation is optional later and requires explicit confirmation before adding API cost.
4. Products need at least one image before listing.
5. Product galleries support up to 6 images.
6. Admin catalogue actions include table view, list/unlist, delete, badges, stock, promo/old price, and source URL.
7. Supabase service-role access must stay server-side only.

## Backlog To Keep Visible

1. Stripe branding still needs cleanup so checkout no longer shows the old Onelink identity.
2. Orders should support full fulfillment operations: packed, shipped, delivered, cancelled, refunded, tracking, and internal notes.
3. Order confirmation email needs live Resend credentials configured and tested.
4. Shipping confirmation email still needs to be built after fulfillment actions exist.
5. Account area needs polish beyond the first magic-link order viewer.
6. Refund workflow should eventually connect to Stripe safely, not just local status changes.
7. Success page can still be refined into a more premium post-purchase experience.
8. We should verify future Stripe checkouts always persist shipping name/address correctly.
