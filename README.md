# Mens Wear

A complete storefront + owner back office for a premium local men’s fashion shop: catalogue, guest
checkout, order tracking, a customer area that needs no password, and one private dashboard that
runs the whole shop — prices, photos, delivery days, offers, the payment QR and the shop’s own words.

Two panels, nothing in between:

| Panel | Who | How they get in |
| --- | --- | --- |
| The shop | Anyone, no account needed to browse | `/` — sign-in is an optional mobile + one-time code |
| Owner dashboard | Only the owner | `/admin/login` — never linked in the customer UI, `noindex`ed, blocked in `robots.txt` |

Built with **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · SQLite**
(`node:sqlite`, no native build step). One process, no external services.

---

## Run it

```bash
npm run up                       # install + .env.local + seed + dev, all if-needed
```

`npm run up` is the one command: it installs dependencies only if they are missing, writes
`.env.local` with a fresh `SESSION_SECRET` only if that file is absent, builds and seeds the
database only if `data/app.db` does not exist, then runs the dev server on port 3000. An existing
shop is left exactly as it is, so it is safe to run every morning. The long way round:

```bash
npm install
cp .env.example .env.local       # set SESSION_SECRET
npm run setup                    # schema + derived images + demo data
npm run dev                      # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run up` | Bring the whole shop up from nothing — or after a reset — then serve it |
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | Apply `src/server/db/schema.sql` (idempotent; new columns are added in place) |
| `npm run db:seed` | 39 products, size/colour stock, 10 customers, 20 orders, settings, owner account |
| `npm run admin:set` | Set the owner login yourself, in your terminal — nothing about it is stored in this repo |
| `npm run typecheck` | `tsc --noEmit` |

**There is no demo owner login.** `npm run db:seed` either uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`
from `.env.local` or generates a password and prints it once in the terminal. To choose (or change)
your own:

```bash
npm run admin:set -- --email you@yourshop.in --name "Your Name"
```

It asks for the password twice on a hidden prompt, stores only a scrypt hash, and revokes every
existing admin session so an old copy of the dashboard stops working immediately.

Customer sign-in is a mobile number plus a one-time code. While `AUTH_DEMO_RETURN_OTP=true` the API
returns the code so the flow can be tested without an SMS provider (any seeded number works, e.g.
`9825011223` for Rohit).

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
scripts/                db setup, seeding, image derivation, owner login
data/                   the SQLite file + owner uploads (git-ignored)
docs/ARCHITECTURE.md    the authoritative map: routes, tables, components, checklists
```

Browsing, filtering, sorting and paging are **URL state** rendered on the server, so the shop is
fast, shareable, works with JS off, and only hydrates what needs it (cart, variants, checkout, the
dashboard’s inline edits).

## What the owner controls from the dashboard

* **Overview** — orders and money today/this month, a 29-day revenue chart, order book by status,
  top sellers, payment split, low stock, unread messages.
* **Products** — add a cloth: photos (multi-upload with progress, drag to reorder, one thumb),
  name, price and strikethrough price, fabric/description/care, sizes × colours with a stock number
  in each cell, **COD / online / both for that style**, **how many days it takes to deliver**, the
  rating shown on its card, and which home-page rails it appears in.
* **Orders** — search and filter, change status along the real timeline, notes the customer sees,
  mark a UPI payment paid, CSV export, printable slip.
* **Inventory** — hand counts, whole-style adjustments, movement ledger, low/out-of-stock warnings.
* **Customers** and **Messages** — spend, order book, addresses; the enquiry inbox.
* **Settings** — shop name, tagline, logo, home-page words and the offer band (what appears on the
  homepage from the start), contact details, WhatsApp, delivery charges, minimum order, return
  window, all four policy texts, **your UPI id + QR image and payment instructions**, **the mobile
  number that gets order alerts**, and the password/session controls.

Nothing there is a copy: the cart quote, the policies, the footer and the tracking pages read the
same rows.

## Money

* **Cash on delivery** — switch it on or off globally, and per style.
* **UPI without a gateway** — put your UPI id and QR image in Settings. Checkout shows the QR, the
  exact amount, a `upi://pay` link that opens GPay/PhonePe/Paytm with the amount filled in, and a
  field for the reference (UTR). The reference is stored on the payment row and shown on the order
  so you can match it in your own bank statement, then press **Mark paid**. No card data ever
  touches this app.
* **A gateway later** — set `onlineMode: gateway` plus `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in
  `.env.local`; `src/server/services/payments.service.ts` is the only place that changes.
* Per style, `payment_mode` is enforced server-side in the quote and again at place-order, so a
  basket containing a prepaid-only suit simply cannot be submitted as COD.

## Order alerts

Every event is written to the `notifications` table first, so nothing is lost if a channel is down.
The dashboard bell reads it (and can raise a browser notification while the tab is open). If
`notifyMobile` is set, the same alert is prepared as a one-tap WhatsApp link for your number — and
**Settings → Order alerts → “Send a test alert”** pushes one row through that exact path so you can
prove the number is right before the first real order lands. If
`notifyWebhookUrl` is set, it is POSTed there — that endpoint is the seam for an SMS or
WhatsApp-business sender.

## Security, in one paragraph

`/admin/*` checks the session on every request — the edge redirect is convenience, not the boundary.
Passwords are scrypt (N=16384) with a per-hash salt; sessions are random 256-bit tokens stored only
as SHA-256, in `httpOnly` `SameSite=Lax` cookies scoped by path, with origin checks on every
state-changing request. Five wrong passwords pause the account, doubling from 15 minutes, and the
per-IP throttle is separate — so neither a bot nor a bored customer can grind the door. Customer
accounts have no passwords at all (OTP only), OTPs are hashed, single-use, capped at five attempts
and rate-limited per number and per IP. Orders are throttled twice over — per IP and per phone
number (four an hour) — so a bored customer cannot flood the order book from one connection or a
hundred. Uploads are re-encoded with `sharp`, confined to
`data/uploads`, and served with `nosniff`. `/admin/**` also sends `X-Frame-Options: DENY`,
`frame-ancestors 'none'`, `form-action 'self'` and `Cache-Control: no-store`, so the dashboard can
be neither framed by a prank page nor left in a shared browser's cache. The login page, this README
and the seed contain no working credentials.

## Deliberately not finished (architecture ready instead)

Real SMS/OTP and WhatsApp delivery (`deliverOtp` + `notifyOrderPlaced` already accept a webhook
provider) · gateway capture/refund webhooks · invoices and GST PDFs, coupons, customer reviews,
wishlist, courier webhooks. The tables and status flows they need already exist.

## Before this goes public

1. `SESSION_SECRET` → a fresh 32-byte random value; run `npm run admin:set` for your own login.
2. `NEXT_PUBLIC_SITE_URL` → the real origin (canonical URLs, Open Graph, `sitemap.xml`).
3. `AUTH_DEMO_RETURN_OTP=false` (ignored in production anyway) and set `OTP_TRANSPORT`.
4. Put your real UPI id + QR in Settings → Payment QR, and your mobile number in Settings → Order alerts.
5. Replace the placeholder photography in the admin image manager, or drop files in
   `public/images/products/` and re-run `node scripts/build-images.mjs`.
