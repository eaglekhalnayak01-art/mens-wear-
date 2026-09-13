# Aakash Men's Wear — Architecture & Structure

Full-stack storefront + owner dashboard for a premium local men's fashion brand.
One deployable Next.js app, with frontend, backend, data and shared UI kept in
separate folders so a real backend (Postgres/Prisma, Razorpay, SMS gateway) can be
swapped in without touching the UI.

```
mens-wear/
├── scripts/                     Node-side tooling (no framework coupling)
│   ├── next.mjs                 CLI launcher (binds 0.0.0.0, hides sqlite notice)
│   ├── catalog.data.mjs         Realistic placeholder catalogue (products, prices, fabric, care)
│   ├── build-images.mjs         Derives gallery crops + colourways from source photos (sharp)
│   ├── db-setup.mjs             Creates ./data/app.db and applies schema
│   └── seed.mjs                 Seeds catalogue, settings, demo customers + orders
│
├── src/
│   ├── app/                     ROUTES ONLY — thin page/handler components
│   │   ├── (store)/             customer website, own layout (header/footer/cart toast)
│   │   │   ├── page.tsx                     Home
│   │   │   ├── shop/page.tsx                Product collection (search/filter/sort)
│   │   │   ├── collections/[slug]/page.tsx  New arrivals · Best sellers · Sale · category
│   │   │   ├── product/[slug]/page.tsx      Product details + gallery + related
│   │   │   ├── about/ contact/ offers/      Brand pages
│   │   │   ├── cart/ checkout/              Cart + 5-step checkout (guest-first)
│   │   │   ├── order/[token]/page.tsx       Confirmation + live tracking timeline
│   │   │   ├── track/page.tsx               Track by order id / mobile
│   │   │   ├── account/…                    Login · OTP · profile · addresses · orders
│   │   │   └── policies/[slug]/page.tsx     Privacy · Terms · Shipping · Returns
│   │   │
│   │   ├── admin/               OWNER DASHBOARD — separate layout + separate cookie
│   │   │   ├── login/           email + password (not linked from the storefront)
│   │   │   ├── (dash)/          guarded group: requireAdminPage() in the layout
│   │   │   │   ├── page.tsx                 Overview (stats + charts + inbox)
│   │   │   │   ├── products/  products/new  products/[id]
│   │   │   │   ├── orders/    orders/[id]    customers/  customers/[id]
│   │   │   │   └── inventory/ settings/ enquiries/
│   │   │
│   │   └── api/                 JSON API (Node runtime, all validation server-side)
│   │       ├── store/…          products, search, cart price-quote, orders, track, auth/otp
│   │       ├── admin/…          products, images, upload, orders/status, customers,
│   │       │                    inventory, settings, stats, auth (login/logout)
│   │       └── media/[…path]    serves owner-uploaded files from /data/uploads
│   │
│   ├── components/              reusable UI, grouped by domain
│   │   ├── ui/                  Button Input Select Modal Drawer Toast Badge EmptyState
│   │   │                        Skeleton Pagination Stepper StatusPill Price SafeImage
│   │   ├── layout/              Header MegaNav MobileMenu Footer AnnouncementBar
│   │   │                        SearchOverlay WhatsAppButton SkipLink
│   │   ├── shop/                ProductCard ProductGrid FilterPanel SortBar ActiveChips
│   │   ├── product/             Gallery VariantPicker QuantityStepper BuyBox
│   │   │                        Accordions(Details/Care/Delivery/Returns) Rating ReviewList
│   │   ├── cart/                CartProvider CartDrawer CartLine
│   │   ├── checkout/            CustomerStep AddressStep SummaryStep PaymentStep
│   │   ├── account/             OtpLoginForm AddressBook OrderList
│   │   ├── home/                Hero CategoryRail CollectionStrip PromoSplit Testimonials
│   │   │                        BrandStory TrustRow
│   │   └── admin/               admin-nav (rail + mobile tabs) page-bits (header, stat
│   │                            card, empty) charts (SVG bars, status bar, top sellers)
│   │                            products-table orders-table inventory-table filter-chips
│   │                            admin-pagination product-form product-form-mapper
│   │                            image-manager variant-editor admin-upload settings-form
│   │                            single-image-field order-status-editor enquiry-inbox
│   │                            admin-login-form print-button
│   │
│   ├── server/                  BACKEND (never imported by client components)
│   │   ├── db/                  index.ts (node:sqlite wrapper, PRAGMAs, tx helpers)
│   │   │   ├── schema.sql       relational DDL
│   │   │   └── seed-utils.mjs
│   │   ├── repositories/        pure data access: products orders customers inventory settings
│   │   ├── services/            business logic: pricing cart orders auth otp uploads
│   │   │                        availability order-status timeline notifications(placeholder)
│   │   ├── security/            passwords (scrypt) sessions (signed cookie + DB) guard
│   │   │                        rate-limit csrf origin-check sanitize
│   │   ├── validation/          zod schemas shared by API + forms
│   │   └── env.ts               typed env access — the only place secrets are read
│   │
│   └── lib/                     client-safe helpers (money/date/format/cn/seo/hooks)
├── data/                        gitignored: app.db, uploads/
└── public/images                fashion photography (source + derived)
```

## Request/data flow

```
Browser ──(RSC, cached)──►  app/(store) pages ──► repositories ──► SQL
       ──(fetch, JSON)───►  app/api routes ──► services ──► repositories ──► node:sqlite
                             ▲                       │
                             └── zod validation ──────┴── pricing (server-authoritative)
                                                       └── events (order timeline rows)
```

* Reads in server components go through `repositories/*` wrapped in React `cache()`
  (per-request de-dupe) + `unstable_cache` with tags (`products`, `settings`, `orders`)
  so admin writes `revalidateTag()` and shoppers get a fast, static-ish catalog.
* Writes always go through an API route → service → repository. Prices, stock,
  discounts, delivery fees are **recomputed server-side**; the client cart is only a
  list of `{variantId, qty}`.

## Data model (SQLite, relational)

```
categories(id, parent_id, name, slug, blurb, image, sort, is_active)
products(id, name, slug, category_id, sub_category, brand, description, fabric, care,
         price, compare_at_price, sku, status[published|hidden|draft],
         is_featured, is_new_arrival, is_bestseller, low_stock_threshold, sold_qty,
         created_at, updated_at, published_at)
product_images(id, product_id, src, alt, sort, is_primary)
colors(id, name, hex)            product_colors(product_id, color_id)
sizes(id, label)                 product_sizes(product_id, size_id, sort)
product_variants(id, product_id, size_id, color_id, sku, stock)   ← stock lives here
customers(id, mobile UQ, name, email, password_hash, created_at, last_login_at)
customer_addresses(id, customer_id, label, line1, line2, city, state, pin, landmark, is_default)
orders(id, public_ref UQ, customer_id?, guest_name, guest_mobile, address_json, subtotal,
       discount, shipping, cod_fee, total, payment_method[cod|online], payment_status,
       status, placed_at, expected_delivery_at, notes, cancelled_reason, updated_at)
order_items(id, order_id, product_id, variant_id, name, size, color, unit_price, qty, image)
order_events(id, order_id, status, note, actor_type, created_at)   ← powers the timeline
payments(id, order_id, provider, intent_id, amount, status, raw_json, created_at)
stock_movements(id, product_id, variant_id, delta, reason, order_id?, created_at)
settings(key PK, value, type[string|number|boolean|json], label?, group?, updated_at)
auth_sessions(id, subject_type[customer|admin], subject_id, token_hash, user_agent, ip,
              expires_at, revoked_at)
otp_challenges(id, mobile, code_hash, purpose, attempts, expires_at, consumed_at)
admin_users(id, name, email UQ, password_hash, role[owner|staff], last_login_at)
```

Deliberate choices:

* **Variant-level stock** (`product_variants.stock`) + a `stock_movements` ledger, so
  "Low stock — only 3 left" and sold-quantity reporting are real, not faked.
* **`settings` key/value** table: the shop owner edits shop name, logo, WhatsApp
  number, delivery charge, COD toggle and policies without a schema change.
* **`order_events`** rows instead of a single status column → the customer timeline,
  admin history and later courier webhooks share one source of truth.
* **No `password` required for customers** (mobile + OTP). `password_hash` is nullable,
  so password login can be switched on later without a migration.
* **No secret in the browser**: OTP codes are stored hashed, sessions are
  `httpOnly` + HMAC-signed cookies validated against `auth_sessions`, and the
  payment/OTP provider keys are read only in `server/env.ts`.

## Pages / component map (customer)

| Route | Server components | Client islands |
|---|---|---|
| `/` | Hero, TrustRow, CategoryRail, CollectionStrip ×3, PromoSplit, Testimonials | `ProductCard` hover, quick-add |
| `/shop`, `/collections/[slug]` | FilterPanel (URL-driven, no JS needed), SortBar, ProductGrid, Pagination | search box, mobile filter drawer |
| `/product/[slug]` | BuyBox, Gallery, Accordions, Related grid, JSON-LD | VariantPicker, QuantityStepper, add-to-cart, image zoom/taps |
| `/cart` | CartLine list, summary, empty state | qty steppers, remove |
| `/checkout` | Steps 1-5, order summary, COD/online | address form + validation |
| `/order/[token]` | confirmation + `OrderTimeline` | track refresh |
| `/account/*` | profile, addresses, orders | OTP form, address dialog |
| `/policies/[slug]` | content from `settings` | — |

## Admin screens

`login` → `/admin` overview (8 stat cards, 14-day revenue bars, order-book bar, top
sellers, needs-attention list, payment mix, unread messages) → `/admin/products`
(table with visibility + rail toggles + safe delete, filters as GET links) →
`/admin/products/new` and `/admin/products/[id]` (one form; image manager with
progress, captions, arrow reorder, thumbnail pick; size × colour stock grid with a
fill-all shortcut) → `/admin/orders` (search, status tabs, one-click “next state”,
CSV export of the current filter) → `/admin/orders/[id]` (lines, address, money,
status editor with a customer-visible note, journey timeline, event log, printable
slip, copyable tracking link) → `/admin/customers` + `/admin/customers/[id]` (spend,
order book, saved addresses) → `/admin/inventory` (per-variant counts, whole-style
adjust, stock ledger) → `/admin/enquiries` (contact-form inbox) → `/admin/settings`
(identity, home-page words, contact, delivery/payment numbers, policy text).

Filters are links and GET forms, so the dashboard works with JS disabled and a
filtered view can be pasted to staff on WhatsApp.

Admin is guarded by `middleware.ts` (cookie *presence* only — a cheap edge redirect
so an anonymous visitor never downloads the dashboard) and by `requireAdmin()` in
every admin route handler + `requireAdminPage()` in the group layout (real DB check
of `auth_sessions`, expiry and revocation) — the edge check is never the only line of
defence. `/admin/**` is `noindex` in metadata and disallowed in `robots.txt`.

## Security checklist

scrypt password hashing (per-user salt, timing-safe compare) · random 32-byte session
tokens stored only as SHA-256 hashes · cookie `httpOnly` `sameSite=lax` `secure` in prod
· DB session revocation on logout · OTP: 15-min expiry, 5 attempts, single-use, hashed,
per-mobile rate limit · login/OTP/order-creation/IP rate limiting · `Origin`/`Sec-Fetch-Site`
CSRF check on every mutating route · zod validation + length clamps server-side (client
validation is UX only) · SQL only through prepared statements · media route resolves and
confines paths inside `data/uploads` and whitelist-checks extensions · customer PII never
returned by admin list endpoints beyond what the screen needs · `Cache-Control: no-store`
on all authenticated API responses · no secrets bundled: nothing sensitive is prefixed
`NEXT_PUBLIC_`.

## Performance

Server components by default (filtering/sorting/pagination are URL state, so browsing
needs almost no JS) · `next/image` with AVIF/WebP + lazy loading and a blur-up
placeholder from an 8-px inline swatch · fonts subset to `latin`, variable, `display=swap`
· catalogue reads cached with tags and revalidated on write · `sharp` build step
normalises photography to one aspect ratio · no animation library (CSS transitions on
`transform`/`opacity` only), `prefers-reduced-motion` respected · charts are hand-rolled
SVG rather than a chart dependency.

## Extension points already wired (not implemented)

`services/payments.ts` (Razorpay/UPI: create intent → verify signature → mark paid),
`services/sms.ts` (OTP/WhatsApp delivery transports), `services/notifications.ts`
(email/WhatsApp/SMS fan-out on order events), `pricing.ts` (`applyCoupons` seam),
`reviews` table left out but `product_reviews` slot documented in schema comments,
`invoices`/`coupons`/`wishlist` mentioned in README roadmap. GST fields (`gst_state`,
`gst_number`) live in `settings` so invoice generation can read them unchanged.
