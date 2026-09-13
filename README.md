# Aakash Men’s Wear

A complete, production-shaped storefront for a premium local men’s fashion shop — catalogue, guest
checkout, order tracking, a customer account area that needs no password, and a private owner
dashboard that runs the whole shop from a phone.

Built with **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · SQLite**
(`node:sqlite`, no native build step). One process, no external services.

---

## Run it

```bash
npm install
cp .env.example .env.local     # then set a real SESSION_SECRET before deploying
npm run setup                  # creates data/app.db, the derived image set, and seeds demo data
npm run dev                    # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | Apply `src/server/db/schema.sql` (idempotent) |
| `npm run db:seed` | 39 products, 677 size/colour variants, 10 customers, 20 orders, settings, owner |
| `npm run typecheck` | `tsc --noEmit` |

**Demo sign-in.** Owner: `admin@aakashmenswear.in` / `Aakash@2026` at `/admin/login`.
Customers sign in with a mobile number and a one-time code — while `AUTH_DEMO_RETURN_OTP=true`
the API returns the code so the flow can be tested without an SMS provider (any seeded number
works, e.g. `9825011223` for Rohit).

---

## What is where

```
src/app/(store)/        storefront: home, shop, collections, product, cart, checkout,
                        order + tracking, account (OTP), about, contact, policies
src/app/admin/          owner dashboard (own layout, own cookie, never linked in the nav)
src/app/api/            JSON API — store/* for the shop, admin/* guarded per request
src/components/         ui/ · layout/ · shop/ · product/ · cart/ · checkout/ · order/ ·
                        account/ · home/ · admin/
src/server/             db/ · repositories/ · services/ · security/ · validation/ · http/
src/lib/                formatting, order status, URL/query contracts, SEO, policies
scripts/                db setup, seeding, image derivation
docs/ARCHITECTURE.md    the authoritative map: routes, tables, components, checklists
data/                   the SQLite file + owner uploads (git-ignored)
```

Browsing, filtering, sorting and paging are **URL state** rendered on the server, so the shop is
fast, shareable, works with JS off, and only hydrates the parts that need it (cart, variants,
checkout, the dashboards’ inline edits).

## The owner dashboard

`/admin` — not linked anywhere in the customer UI, `noindex`ed, disallowed in `robots.txt`, and
gated twice: a cheap edge redirect on cookie presence, then a real session/role check inside every
page and every `admin/*` route.

Overview (revenue bars, order book, top sellers, low stock, unread messages) · Products (visibility,
home-page rails, safe delete, full form with image manager and a size × colour stock grid) ·
Orders (filters, CSV export, one-click next status, customer-visible notes, printable slip) ·
Inventory (hand counts, whole-style adjustments, movement ledger) · Customers (spend, order book,
addresses) · Messages · Settings — the shop’s name, contact details, WhatsApp button, home-page
words, delivery charges, minimum order, COD/online flags, return window and all four policy texts.

Nothing on that screen is a copy: the cart quote, the policies, the footer and the tracking pages
all read the same rows.

## Deliberately not finished (architecture ready instead)

Real SMS/OTP delivery (`deliverOtp` in `src/server/services/auth.service.ts` already accepts a webhook provider) · a payment
gateway — `onlineEnabled` in Settings stays off until Razorpay/UPI is wired, and checkout says so
plainly · invoices/GST PDFs, coupons, reviews, wishlist, courier webhooks, multi-courier shipping
options. The tables and status flows those need already exist.

## Before this goes public

1. `SESSION_SECRET` → a fresh 32-byte random value; `ADMIN_EMAIL`/`ADMIN_PASSWORD` → your own.
2. `NEXT_PUBLIC_SITE_URL` → the real origin (canonical URLs, Open Graph, `sitemap.xml`).
3. `AUTH_DEMO_RETURN_OTP=false` (it is ignored in production anyway) and set `OTP_TRANSPORT`.
4. Replace the generated placeholder photography via the admin image manager, or drop files in
   `public/images/products/` and re-run `node scripts/build-images.mjs`.
