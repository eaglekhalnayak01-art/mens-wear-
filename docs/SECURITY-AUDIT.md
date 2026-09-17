# Security audit — customer data isolation, orders, admin

Audited on the whole project (pages, API routes, services, repositories, SQL schema, config,
uploads, headers), then fixed, then **proven with an executable battery**:

```bash
npm run security:check          # 22 authorization tests against a running dev shop
npm run security:check -- --clean   # and remove the two throwaway accounts afterwards
```

Scope note: this shop has **no Firebase and no Firestore** — a SQLite file reached only through
server code (`src/server/db`). So there is no `firestore.rules` to publish; the equivalent
control is the authorization layer in `src/server/http/handler.ts` plus the ownership predicates
in `src/server/repositories/*`, which is what the tests below attack. Where this document says
"database rule", read "the `WHERE` clause and the guard that runs before it".

---

## 1. What was already secure

| Area | Control that was in place before this audit |
| --- | --- |
| Identity | One `handle({ auth })` wrapper for every API route; `auth: "admin"` on 20 of 21 admin routes, the multipart upload route calling `requireAdmin()` before it touches the disk. |
| Sessions | `httpOnly` + `SameSite=Lax` cookies with `Secure` in production, 12 h for the owner / 30 d for a customer, only `sha256(token)` stored, expiry and revocation re-checked in the database on every request (the cookie alone proves nothing). |
| Role separation | Customers authenticate against `customers`, the owner against `admin_users`, and every `auth_sessions` row is stamped `subject_type` — a customer token cannot be replayed on an admin route. |
| Ownership queries | Order lists and profile reads are keyed to the session (`WHERE o.customer_id = ?`); address updates and deletes carry `WHERE id = ? AND customer_id = ?`. |
| Client identity | No endpoint accepts a `userId`/`customerId` from a body, query string or localStorage — verified by grep and by test 3. |
| Money | Prices, discounts, delivery fee, COD fee, stock and totals are recomputed server-side from the database; the cart in the browser is a preview only. Stock moves inside a transaction. Per-style COD/online rules are enforced at place-order, not just in the UI. |
| Passwords | scrypt (N=16384, r=8, p=1, 64-byte) with a per-user salt; never selected into any API response; 12-character minimum; a dummy constant-time verify for unknown emails; 5 wrong owner tries pause the account. |
| Abuse | In-process buckets: admin login 12/15 min per IP + 6/10 min per account, password change 5/15 min, OTP 6/10 min per number, orders 12/hour per IP plus 4/hour per number, uploads 60/10 min, contact 5/30 min. |
| CSRF | Same-origin assertion on every mutating route (plus `Sec-Fetch-Site: cross-site` rejection), on top of `SameSite=Lax`. |
| Headers | `nosniff`, `Referrer-Policy`, `X-Frame-Options` (DENY on `/admin` in production), COOP, `no-store` on every API response and admin page, `/admin` blocked in `robots.txt` + `noindex`, and no admin link anywhere in the storefront. |
| Uploads | Real image-signature check, re-encoded to one WebP, written under the upload root; `/api/media/[...path]` resolves inside that root only, so `..` traversal and symlink escapes fail. |
| Secrets | Nothing secret is committed: `.env.example` holds placeholders, no `NEXT_PUBLIC_*` value carries a credential, and `AUTH_DEMO_RETURN_OTP` is *impossible* to honour in production (`env.otp.returnCode` is `!isProduction && …`). |
| Admin data | The dashboard shows what fulfilment needs (name, number, address, items, payment reference). Password hashes, session tokens and secrets are never in an admin payload or the CSV export. |

## 2. What was insecure

1. **Order pages were capability-free (IDOR).** `/order/[token]` rendered the customer's name,
   mobile number, full delivery address, items and payment status for **anyone holding the bare
   reference** — a value printed on paper slips, pasted into WhatsApp groups and easy to guess at
   5 characters. `/track` did the same with a `?ref=` link.
2. **`/track` listed a stranger's parcels from a phone number alone.** `listRecentOrdersForMobile`
   answered for any 10 digits typed into the box: no proof of anything.
3. **Those lookups were GET forms and links**, so order number + mobile landed in the URL: browser
   history, proxy and CDN logs.
4. **Nothing throttled those pages**, so references could be walked.
5. **`handle()` validated the body before authorising the caller.** A logged-out POST to
   `/api/admin/products` returned a *400 with field names* instead of 401 — a free schema oracle
   on admin-only routes.
6. **`auth: "customer"` answered 400 "Please sign in."** — an authentication failure must be 401;
   clients cannot branch on a 400.
7. **`saveAddress` lied on a failed IDOR attempt.** The scoped `UPDATE` matched 0 rows and the
   route still returned `{ok:true, id}` — a silent no-op that the UI reported as saved.
8. **Reference generation had a predictable fallback:** after 6 collisions `uniquePublicRef()`
   returned `AMW-<year>-<Date.now() base36>`, i.e. sequential and guessable.
9. **A signed-in customer who typed `/admin` got the owner password form**, not a statement that
   the role does not exist here — bad UX that invites credential stuffing.
10. **No Content-Security-Policy at all** (only framing/sniffing/referrer headers).
11. **No customer-facing security page** — only the owner-editable `/policies/privacy` text.
12. **`OTP_TRANSPORT=log` in production** wrote real one-time codes to the server console and told
    nobody; customers simply could not sign in.
13. **Bug found while gating the order page:** `CancelOrder` took a prop literally named `ref`, so
    React threw *"Refs cannot be used in Server Components"* — the cancel dialog on the order page
    was broken (and the error was being swallowed).

## 3. What was fixed

| Finding | Change |
| --- | --- |
| 1, 2 | New single decision point `src/server/security/order-access.ts`: an order opens for **its owner's session**, for a **signed capability link** (`ref.HMAC-SHA256(SESSION_SECRET, ref)`, `timingSafeEqual`), or after **reference + the mobile on the order** is confirmed. `/order/[token]` renders an order *only* in those cases; otherwise it renders a verifier with zero order fields. `/track` no longer lists by bare phone number. `canReadOrder` is the only place this is decided, and `generateMetadata` no longer names an order for an unverified link (titles leak into search results and previews). |
| — | The verifier keeps the reference case-insensitive but the signature byte-exact
  (base64url is mixed-case: upper-casing the whole URL segment invalidates our own links —
  caught by the battery, which asserts the order renders rather than the string appearing). |
| 1 | Checkout, the customer's account list, tracking cards and the WhatsApp confirmation link now use `orderTrackingPath(ref)` — the signed URL — so a legitimate holder is never asked to re-prove. |
| 3 | `POST /api/store/orders/verify` replaces the tracking GET form (`components/order/track-order-form.tsx`); nothing is written into the URL. |
| 4, 10 | The verifier is rate limited (30 / 10 min per device) and the storefront + `/admin` now send an enforced CSP (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` in production, `upgrade-insecure-requests`). |
| 5, 6 | `handle()` order is now: CSRF → read raw body → rate limit → **authenticate/authorise** → validate → business logic. `auth: "customer"` returns **401** with `Please sign in with your mobile number to continue.` |
| 7 | `saveAddress` checks the scoped update's row count and raises **404 "That address is not in your account."** |
| 8 | References are 8 characters from the no-lookalike alphabet (~40 bits); the `Date.now()` fallback now throws instead of minting a guessable id. |
| 9 | `/admin/login` shows an **Access denied — this is the owner's area** panel (with a route to the shopper's own account) when a customer session is present. Server-side rejection was already there; this is the honest explanation, not the control. |
| 11 | New `/security` page: secure account, privacy, orders, payments, personal data, authentication, plus account-safety habits and a "what we cannot promise" note. Written to describe only shipped controls — no "100 % secure", no "hack-proof". Linked from the footer; `/policies/privacy` keeps the legal text and is cross-linked, not duplicated. |
| 12 | `src/server/env.ts` warns at boot in production when `OTP_TRANSPORT` is `log` or `off`. |
| 13 | `CancelOrder` prop renamed `ref` → `orderRef`; the order page renders clean. |
| — | The battery itself (`scripts/security-check.mjs`) is committed, so these claims are checkable by the owner after any refactor. |

## 4. What still requires backend / production configuration

Not fixable in application code — each is a deployment decision:

1. **Real OTP delivery.** `OTP_TRANSPORT=webhook` + `SMS_WEBHOOK_URL` (+ `SMS_WEBHOOK_TOKEN`).
   Until an SMS bridge exists, production customers cannot receive codes; password sign-in still
   works. Nothing in the app sends an SMS today, and `/security` does not claim otherwise.
2. **HTTPS + `NEXT_PUBLIC_SITE_URL`.** `Secure` cookies and `upgrade-insecure-requests` are already
   conditioned on production; they only mean something once TLS is terminated in front of the app.
   Signed tracking links are bearer URLs: no IP pinning, no short expiry, because a customer opens
   them from an SMS on a different network. If that trade is unacceptable for the shop, the fix is
   an expiring token (a `used_at`/`expires_at` column) — not a code change alone.
3. **Rate limits are per process.** They are in-memory; two workers under PM2 cluster or a second
   container doubles the allowance. Move the buckets to Redis (or a small `rate_buckets` table)
   before scaling horizontally.
4. **Payment reconciliation is manual by design.** The customer types their UTR and the owner marks
   paid — no gateway confirms it. Adding Razorpay keys turns on real capture/refund callbacks; until
   then the shop must verify a reference in its own UPI app. `/security` words this honestly.
5. **Backups and disk encryption.** `data/app.db` (all customer PII) and `data/uploads` are the only
   copies; they are git-ignored and unencrypted at rest. Encryption, off-box backup and who may read
   the file are host-level obligations.
6. **CSP nonce instead of `'unsafe-inline'`.** Enforced today, but scripts/styles still allow inline,
   because Next emits bootstrap inline scripts. Shipping nonces (middleware-generated, passed to
   `next/script`) is the follow-up that closes the XSS hole this policy only half-covers.
7. **Admin hardening that needs a decision, not a patch:** no IP allowlist, no TOTP second factor,
   and no per-route audit log for the owner (order events are logged; reads are not). Any of the three
   is a small change — each needs the shop's agreement about who may do it and from where.
8. **Account recovery.** A lost phone number means the shop must intervene manually (the customer
   table is keyed on the mobile). An email-verified reset path needs `SMTP`/verification infrastructure
   that does not exist yet.

## Final report

| Area | Status |
| --- | --- |
| Authentication | **PASS** |
| Customer data isolation | **PASS** — tests 2, 2d, 3, 3b |
| Order authorization | **PASS** — tests 1, 2, 7, 7c, 7d |
| Admin authorization | **PASS** — tests 4, 5, 5b (401/403 at the API, not the menu) |
| Database rules (server-side ownership) | **PASS** — session-keyed reads, `id AND customer_id` writes, 7b/7c |
| API authorization | **PASS** — auth runs before validation; 401 vs 403 vs 404 distinguished |
| Route protection | **PASS** — middleware + per-page `requireAdminPage()` / `requireCustomerPage()`, `/admin` noindex |
| Secret / API key exposure | **PASS** — nothing secret in git or in client JS; demo OTP impossible in production |
| Security page | **CREATED** — `/security`, linked from the footer, cross-referenced with `/policies/*` |

Everything marked PASS is asserted by `npm run security:check` (22/22 at the time of writing, `--clean` afterwards so
the shop keeps its demo data).
Section 4 is the honest list of what still depends on the shop's own infrastructure.
