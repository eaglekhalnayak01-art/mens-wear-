# Mens Wear — Architecture & Structure

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
         rating, rating_count, payment_mode[both|cod|online], delivery_days,
         created_at, updated_at, published_at)   ← payment_mode/delivery_days are per style
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
admin_users(id, name, email UQ, password_hash, role[owner|staff], failed_attempts,
            locked_until, created_at, last_login_at)
notifications(id, event, title, body, channel[inbox|webhook|whatsapp|email], target,
              order_ref, sent_at, read_at, created_at)   ← the dashboard bell's queue
```

New columns on an existing database are added in place at boot by
`addMissingColumns()` in `src/server/db/index.ts` (SQLite has no `ADD COLUMN IF NOT
EXISTS`), so a live shop upgrades without losing its orders.

Deliberate choices:

* **Variant-level stock** (`product_variants.stock`) + a `stock_movements` ledger, so
  "Low stock — only 3 left" and sold-quantity reporting are real, not faked.
* **`settings` key/value** table: the shop owner edits shop name, logo, WhatsApp
  number, delivery charge, COD toggle and policies without a schema change.
* **`order_events`** rows instead of a single status column → the customer timeline,
  admin history and later courier webhooks share one source of truth.
* **No `password` required for customers** (mobile + OTP). `password_hash` is nullable,
  so password login can be switched on later without a migration.
* **`payment_mode` on the product, not only on the shop**: a made-to-order suit is
  prepaid-only, a heavy coat may be cash-only. `quoteCart` computes whether the whole
  basket allows COD/online, checkout dims what it refuses, and place-order re-checks it
  — a client cannot talk its way into a refused method.
* **Alerts are rows before they are messages**: `notifications` is written first, the
  webhook/WhatsApp fan-out is best-effort afterwards, so an offline laptop costs the
  owner an alert, never an order.
* **No secret in the browser**: OTP codes are stored hashed, sessions are
  `httpOnly` + HMAC-signed cookies validated against `auth_sessions`, and the
  payment/OTP provider keys are read only in `server/env.ts`. UPI ids and the QR image
  are shop *settings* (public by nature); nothing that authenticates lives in the page.

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
slip, copyable tracking link, **payment row: the UPI reference the customer typed and
Mark paid / Awaiting / Failed buttons**) → `/admin/customers` + `/admin/customers/[id]` (spend,
order book, saved addresses) → `/admin/inventory` (per-variant counts, whole-style
adjust, stock ledger) → `/admin/enquiries` (contact-form inbox) → `/admin/settings`
(groups: identity + logo, home-page words and the offer band, contact, delivery numbers,
**Payment QR** (UPI id, QR upload, instructions, UTR required, COD per shop), **Order
alerts** (your mobile, email, webhook), policy text) plus the **Security** card (change
password, sign out every other device, clear a wrong-attempt pause).

The bell in the dashboard header polls `GET /api/admin/notifications` every 45 s while
the tab is visible and can raise a browser notification for new orders; marking read is
`POST /api/admin/notifications`.

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
per-mobile rate limit · login/OTP/order-creation/IP rate limiting · **account lockout: 5 wrong
passwords pause that account (15 min, then 30, capped at 60) independently of the per-IP
bucket, with a constant-time dummy verify so a wrong email and a wrong password answer the
same way** · `POST /api/admin/auth/password` re-hashes and revokes every admin session ·
`DELETE /api/admin/auth/sessions` signs the account out everywhere else · no credential in
the login page, the seed, this README or the docs (owner login is created by `npm run
admin:set`) · `Origin`/`Sec-Fetch-Site`
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

`services/payments.service.ts` takes a UPI QR + reference today (`onlineMode: "qr"`) and
swaps to `gateway` when `RAZORPAY_KEY_ID`/`SECRET` arrive — create intent → verify
signature → mark paid, reusing the same `payments` row and the same admin button.
`notifications.service.ts` writes the alert and POSTs to `notifyWebhookUrl`; an SMS or
WhatsApp-business sender is one `fetch` in `post()`. `auth.service.ts: deliverOtp` is the
matching seam for real OTP codes. `pricing.ts` keeps the `applyCoupons` seam,
`reviews` table left out but `product_reviews` slot documented in schema comments,
`invoices`/`coupons`/`wishlist` mentioned in README roadmap. GST fields (`gst_state`,
`gst_number`) live in `settings` so invoice generation can read them unchanged.
