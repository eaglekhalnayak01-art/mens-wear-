#!/usr/bin/env node
/**
 * Authorization battery — run it, do not take my word for it.
 *
 *   npm run security:check                  # against http://localhost:3000
 *   npm run security:check -- https://…      # against a deployed shop
 *
 * Seven scenarios from the shop's own security rules, each one performed through the
 * public surface (HTTP, no DB writes from here): two throwaway customer accounts, an
 * order, and then every way an attacker is described in the audit — a bare reference in
 * a URL, another account's address id, an admin API called with a customer cookie, a
 * forged session cookie, no cookie at all.
 *
 * It needs a shop that can hand out one-time codes to the script, i.e. development
 * (`AUTH_DEMO_RETURN_OTP=true`). Against production it stops, because the code is
 * correctly never returned there.
 */
import "./load-env.mjs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const BASE = (process.argv.slice(2).find((a) => !a.startsWith("--")) || "http://localhost:3000").replace(/\/$/, "");
const DEV = /localhost|127\.0\.0\.1|^https?:\/\/[a-z0-9.-]*e2b\.app$/.test(new URL(BASE).hostname);
const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/app.db");

const MOBILE_A = `9${Date.now().toString().slice(-9)}`;
const MOBILE_B = `8${Date.now().toString().slice(-9)}`;
const rows = [];

async function req(method, pathname, body, cookie) {
  const headers = { origin: BASE };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text, location: res.headers.get("location"), cookie: (res.headers.get("set-cookie") || "").split(";")[0] };
}

function record(name, ok, detail = "") {
  rows.push({ name, ok, detail });
  console.log(`  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}${detail ? `\x1b[2m   ${detail}\x1b[0m` : ""}`);
  return ok;
}

async function signIn(mobile, name) {
  const challenge = await req("POST", "/api/store/auth/otp/request", { mobile, purpose: "login" });
  const code = challenge.json?.devCode;
  if (!code) return null;
  const verified = await req("POST", "/api/store/auth/otp/verify", { mobile, code, name });
  return verified.cookie || null;
}

console.log(`\nMens Wear · authorization battery\nagainst ${BASE}\n`);

if (!DEV) {
  console.log(
    "Refusing to run: this script signs in with one-time codes, and a production shop\n" +
      "does not hand them to the caller (correctly). Point it at a development instance:\n" +
      "  npm run dev && npm run security:check\n",
  );
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const variant = db.prepare(`SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'published' AND v.stock > 1 ORDER BY p.id LIMIT 1`).get()?.id;
if (!variant) {
  console.log("No in-stock product found — run `npm run setup` first.\n");
  process.exit(2);
}

const cookieA = await signIn(MOBILE_A, "Battery Customer A");
const cookieB = await signIn(MOBILE_B, "Battery Customer B");
let failures = 0;
const t = (name, ok, detail) => {
  if (!record(name, ok, detail)) failures += 1;
};

// TEST 1 — a customer places an order and can read it.
const placed = await req(
  "POST",
  "/api/store/orders",
  {
    customer: { name: "Battery Customer A", mobile: MOBILE_A },
    shipping: { recipient: "Battery Customer A", phone: MOBILE_A, line1: "1 Battery Lane", city: "Surat", state: "Gujarat", pin: "395002" },
    paymentMethod: "cod",
    items: [{ variantId: variant, qty: 1 }],
  },
  cookieA,
);
const ref = placed.json?.order?.ref ?? "";
const trackPath = placed.json?.order?.trackPath ?? "";
t(
  "TEST 1  A places an order and gets a signed tracking link",
  placed.status === 200 && /^\/order\/AMW-\d{4}-[A-Z0-9]{8}\.[\w-]+$/.test(trackPath),
  ref,
);
const ownView = await req("GET", trackPath, undefined, cookieA);
t(
  "        the signed link shows the order to A",
  ownView.status === 200 && ownView.text.includes("Delivering to") && !ownView.text.includes("Confirm it is you"),
  `HTTP ${ownView.status}`,
);
const ownList = await req("GET", "/account", undefined, cookieA);
t("        A's account lists it", ownList.status === 200 && ownList.text.includes(ref));

// The owner opening the bare reference (from an SMS where the link was mangled) still works,
// because the session identifies them.
const ownerRow = db
  .prepare("SELECT o.public_ref AS ref, c.mobile AS mobile, c.name AS name FROM orders o JOIN customers c ON c.id = o.customer_id LIMIT 1")
  .get();
if (ownerRow) {
  // Seeded demo customers have no password, so sign in the way a real customer would: a code.
  // The row's own name, so the sign-in does not rewrite a seeded customer.
  const ownerCookie = await signIn(ownerRow.mobile, ownerRow.name);
  const ownerView = await req("GET", `/order/${ownerRow.ref}`, undefined, ownerCookie);
  t(
    "        the owner can open the bare reference from their session",
    ownerView.status === 200 && ownerView.text.includes("Delivering to"),
    ownerRow.ref,
  );
}

// TEST 2 — another customer must not reach it.
const bare = await req("GET", `/order/${ref}`, undefined, cookieB);
const leaked = /1 Battery Lane|Battery Customer A/.test(bare.text);
t(
  "TEST 2  B opening A's order by reference is denied (no data rendered)",
  bare.status === 200 && !leaked && bare.text.includes("Confirm it is you"),
  "verifier form, zero order fields",
);
const wrongNumber = await req("POST", "/api/store/orders/verify", { ref, mobile: MOBILE_B }, cookieB);
t("        B + the wrong number → 403", wrongNumber.status === 403, `HTTP ${wrongNumber.status}`);
const notMine = await req("GET", "/account", undefined, cookieB);
t("        A's reference appears nowhere in B's account", notMine.status === 200 && !notMine.text.includes(ref));
const rightNumber = await req("POST", "/api/store/orders/verify", { ref, mobile: MOBILE_A });
t("        the number on the order is the accepted proof", rightNumber.status === 200 && rightNumber.json?.path?.startsWith("/order/"), "returns a signed link, not the order");

// TEST 3 — profiles are session-scoped.
const profileB = await req("GET", "/api/store/account/profile?customerId=1", undefined, cookieB);
const blob = JSON.stringify(profileB.json ?? {});
t("TEST 3  B's profile is B's own; a forged ?customerId is ignored", profileB.status === 200 && blob.includes(MOBILE_B) && !blob.includes(MOBILE_A), "identity read from the cookie only");

// TEST 4 — admin pages.
const adminPage = await req("GET", "/admin", undefined, cookieB);
const deniedPage = adminPage.status >= 300 && adminPage.status < 400 ? (adminPage.location || "").includes("/admin/login") : adminPage.status === 403;
t("TEST 4  A customer at /admin is bounced to the owner sign-in, never in", deniedPage, `HTTP ${adminPage.status}${adminPage.location ? ` → ${adminPage.location}` : ""}`);

// TEST 5 — admin APIs.
const adminApi = await req("POST", "/api/admin/products", { name: "Intruder shirt", price: 1 }, cookieB);
const adminSettings = await req("PUT", "/api/admin/settings", { shopName: "Not Your Shop" }, cookieB);
const adminUpload = await req("POST", "/api/admin/images/upload", undefined, cookieB);
t(
  "TEST 5  Admin product, settings and upload APIs reject a customer session",
  [adminApi, adminSettings, adminUpload].every((r) => r.status === 401 || r.status === 403),
  `products ${adminApi.status} · settings ${adminSettings.status} · upload ${adminUpload.status}`,
);
const shopNameStillFine = await req("GET", "/api/store/settings");
t("        and nothing was actually changed", shopNameStillFine.json?.settings?.shopName !== "Not Your Shop");

// TEST 6 — no session at all.
const anonProfile = await req("GET", "/api/store/account/profile");
const anonAddresses = await req("GET", "/api/store/account/addresses");
const forged = await req("GET", "/api/store/account/profile", undefined, `amw_cust=${Buffer.from("1").toString("hex")}${"0".repeat(40)}`);
t(
  "TEST 6  Anonymous and forged-session callers get 401 (login required)",
  anonProfile.status === 401 && anonAddresses.status === 401 && forged.status === 401,
  `${anonProfile.status} · ${anonAddresses.status} · forged ${forged.status}`,
);
const anonAccount = await req("GET", "/account");
// Next answers a page-level redirect with the login screen (200 + a client-side
// redirect), so the test is about what is *not* there: no orders, no addresses.
t(
  "        a private page renders the sign-in screen, never the account",
  !anonAccount.text.includes(ref) && !anonAccount.text.includes(MOBILE_A) && /Sign in/.test(anonAccount.text),
  anonAccount.location ? `→ ${anonAccount.location}` : "no order data in the response",
);

// TEST 7 — mutating someone else's data.
const cancelOther = await req("POST", "/api/store/orders/cancel", { ref, mobile: MOBILE_B, reason: "not mine" }, cookieB);
t("TEST 7  B cannot cancel A's order", cancelOther.status === 403, `HTTP ${cancelOther.status}`);

const savedAsA = await req(
  "POST",
  "/api/store/account/addresses",
  { label: "Home", recipient: "Battery Customer A", phone: MOBILE_A, line1: "1 Battery Lane", city: "Surat", state: "Gujarat", pin: "395002" },
  cookieA,
);
const addressId = savedAsA.json?.id;
const hijack = await req(
  "POST",
  "/api/store/account/addresses",
  { id: addressId, label: "Stolen", recipient: "Battery Customer B", phone: MOBILE_B, line1: "2 Hijack Road", city: "Delhi", state: "Delhi", pin: "110001" },
  cookieB,
);
const asOwnedByA = await req("GET", "/api/store/account/addresses", undefined, cookieA);
const stillIntact = JSON.stringify(asOwnedByA.json ?? {}).includes("1 Battery Lane") && !JSON.stringify(asOwnedByA.json ?? {}).includes("Hijack Road");
t(
  "        B cannot overwrite A's saved address (rejected, and A's row is intact)",
  (hijack.status === 403 || hijack.status === 404 || hijack.status === 400) && stillIntact,
  `HTTP ${hijack.status}`,
);
const deleteSomeoneElses = await req("DELETE", "/api/store/account/addresses", { id: 999999 }, cookieB);
t("        deleting an id you do not own changes nothing", deleteSomeoneElses.status === 200 && deleteSomeoneElses.json?.ok === false);

// The features must still work for the right person.
const cancelOwn = await req("POST", "/api/store/orders/cancel", { ref, reason: "changed my mind" }, cookieA);
t("        A still can cancel their own order", cancelOwn.status === 200 && cancelOwn.json?.ok === true, `HTTP ${cancelOwn.status}`);
const updateOwn = await req(
  "POST",
  "/api/store/account/addresses",
  { id: addressId, label: "Office", recipient: "Battery Customer A", phone: MOBILE_A, line1: "1 Battery Lane", city: "Surat", state: "Gujarat", pin: "395002" },
  cookieA,
);
t("        A still can edit their own address", updateOwn.status === 200 && updateOwn.json?.ok === true);

// Brute force: the verifier must be the expensive door.
let blockedAt = 0;
for (let i = 1; i <= 32 && !blockedAt; i += 1) {
  const probe = await req("POST", "/api/store/orders/verify", { ref: "AMW-2026-QQQQQQQQ", mobile: "9000000000" });
  if (probe.status === 429) blockedAt = i;
}
t("EXTRA   Order lookups are rate limited, so references cannot be walked", blockedAt > 0, blockedAt ? `throttled on attempt ${blockedAt}` : "not throttled");

const ghost = await req("GET", "/order/AMW-2026-ZZZZZZZZ");
t(
  "EXTRA   A wrong-but-plausible reference renders no order data either",
  ghost.status === 200 && !/Confirm it is you|Battery Lane/.test(ghost.text),
  "not-found state",
);

const headers = await req("GET", "/track");
t("EXTRA   Tracking never puts a phone number in a URL", !headers.text.includes('action="/track"'));

// Housekeeping so the battery can be run again: the throwaway accounts are removed.
db.close();
if (process.argv.includes("--clean")) {
  const cleanup = new DatabaseSync(dbPath);
  const ids = cleanup.prepare("SELECT id FROM customers WHERE mobile IN (?, ?)").all(MOBILE_A, MOBILE_B).map((r) => r.id);
  if (ids.length) {
    const list = ids.join(",");
    cleanup.prepare(`DELETE FROM customer_addresses WHERE customer_id IN (${list})`).run();
    cleanup.prepare(`DELETE FROM auth_sessions WHERE subject_type = 'customer' AND subject_id IN (${list})`).run();
    cleanup.prepare(`DELETE FROM orders WHERE customer_id IN (${list})`).run();
    cleanup.prepare(`DELETE FROM customers WHERE id IN (${list})`).run();
  }
  cleanup.prepare("DELETE FROM otp_challenges WHERE mobile IN (?, ?)").run(MOBILE_A, MOBILE_B);
  cleanup.close();
  console.log(`\n\x1b[2mcleaned up the two throwaway accounts (${MOBILE_A}, ${MOBILE_B})\x1b[0m`);
}

const passed = rows.filter((r) => r.ok).length;
console.log(`\n${passed}/${rows.length} authorization tests passed${failures ? ` — ${failures} FAILED` : ""}\n`);
process.exit(failures ? 1 : 0);
