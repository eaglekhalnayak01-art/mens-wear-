/**
 * Customer identity: mobile number + 6-digit OTP, and nothing else.
 *
 * Why OTP-first: it is the flow Indian local shops actually use, it keeps
 * registration to one screen, and it removes password reuse. A password hash
 * column exists so password login can be switched on later without a migration.
 *
 * Codes are stored as SHA-256 digests (a DB leak cannot replay them), expire in
 * 10 minutes, allow 5 wrong guesses, and are single-use.
 */
import { env } from "@/server/env";
import { all, get, insert, nowIso, run, tx } from "@/server/db";
import { badRequest, HttpError, rateLimited, unauthorized } from "@/server/http/errors";
import { consume } from "@/server/security/rate-limit";
import { readSettings } from "@/server/repositories/settings.repository";
import { digestEquals, hashToken, randomOtp } from "@/server/security/crypto";
import { createSession } from "@/server/security/sessions";
import { findCustomer, upsertCustomerByMobile, updateProfile } from "@/server/repositories/customers.repository";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type OtpOutcome = {
  mobile: string;
  /** Present only in development so the demo can be completed without SMS. */
  devCode?: string;
  resendAfterSeconds: number;
  isNewCustomer: boolean;
};

async function deliverOtp(mobile: string, code: string) {
  if (env.otp.transport === "off") return;

  // Branded from Settings, so an owner renaming the shop does not send SMS that
  // still names the old one.
  const brand = readSettings().shopName || "our shop";
  const message = `${code} is your ${brand} verification code. It expires in 10 minutes. Do not share it with anyone.`;

  if (env.otp.transport === "webhook" && env.otp.webhookUrl) {
    try {
      // Provider-agnostic shape: swap for Twilio / MSG91 / Gupshup in one place.
      await fetch(env.otp.webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.otp.webhookToken ? { authorization: `Bearer ${env.otp.webhookToken}` } : {}),
        },
        body: JSON.stringify({ to: `91${mobile}`, message }),
      });
      return;
    } catch (error) {
      console.error("[otp] provider delivery failed", error);
      throw new HttpError(503, "server_error", "We could not send the code right now. Please try again in a minute.");
    }
  }

  // Development transport — visible in the terminal running `npm run dev`.
  console.log(`\n┌─ OTP for ${mobile} ─ ${code} ─ expires in 10 min ─\n`);
}

export async function requestOtp(mobile: string, purpose: "login" | "register" | "reset"): Promise<OtpOutcome> {
  const perNumber = consume(`otp:${mobile}`, 4, 10 * 60 * 1000);
  if (!perNumber.ok) {
    throw rateLimited("You have asked for a few codes already. Please wait a minute before trying again.", perNumber.retryAfterSec);
  }
  const perIp = consume(`otp-ip:${mobile.slice(0, 4)}`, 12, 10 * 60 * 1000);
  if (!perIp.ok) throw rateLimited("Too many attempts from this device. Please try again later.", perIp.retryAfterSec);

  const recent = get<{ created_at: string }>(
    `SELECT created_at FROM otp_challenges WHERE mobile = ? ORDER BY id DESC LIMIT 1`,
    mobile,
  );
  if (recent) {
    const since = Date.now() - new Date(recent.created_at + "Z").getTime();
    if (since < 25_000) {
      throw rateLimited("A code is already on its way. You can request the next one in a few seconds.", Math.ceil((25_000 - since) / 1000));
    }
  }

  const code = randomOtp();
  insert(
    `INSERT INTO otp_challenges (mobile, code_hash, purpose, expires_at, created_at) VALUES (?,?,?,?,?)`,
    mobile,
    hashToken(code),
    purpose,
    new Date(Date.now() + OTP_TTL_MS).toISOString(),
    nowIso(),
  );
  // Previous codes for this number stop working, so only the newest is valid.
  run(
    `UPDATE otp_challenges SET consumed_at = ? WHERE mobile = ? AND consumed_at IS NULL AND id <> (SELECT MAX(id) FROM otp_challenges WHERE mobile = ?)`,
    nowIso(),
    mobile,
    mobile,
  );

  await deliverOtp(mobile, code);

  return {
    mobile,
    devCode: env.otp.returnCode ? code : undefined,
    resendAfterSeconds: 30,
    isNewCustomer: !findCustomer(mobile),
  };
}

export class OtpFailure extends Error {
  field: string;
  constructor(message: string, field = "code") {
    super(message);
    this.field = field;
  }
}

export async function verifyOtp(input: { mobile: string; code: string; name?: string; email?: string }) {
  const throttle = consume(`otp-verify:${input.mobile}`, 8, 10 * 60 * 1000);
  if (!throttle.ok) throw rateLimited("Too many wrong attempts. Please request a fresh code in a minute.", throttle.retryAfterSec);

  const challenge = get<{
    id: number;
    code_hash: string;
    expires_at: string;
    attempts: number;
    consumed_at: string | null;
  }>(
    `SELECT id, code_hash, expires_at, attempts, consumed_at FROM otp_challenges
      WHERE mobile = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`,
    input.mobile,
  );

  if (!challenge) throw new OtpFailure("We could not find a fresh code for this number. Please request one.");
  if (new Date(challenge.expires_at + (challenge.expires_at.endsWith("Z") ? "" : "Z")).getTime() < Date.now()) {
    run(`UPDATE otp_challenges SET consumed_at = ? WHERE id = ?`, nowIso(), challenge.id);
    throw new OtpFailure("That code has expired. Please request a new one.");
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    run(`UPDATE otp_challenges SET consumed_at = ? WHERE id = ?`, nowIso(), challenge.id);
    throw new OtpFailure("Too many wrong attempts. Please request a new code.");
  }
  if (!digestEquals(challenge.code_hash, hashToken(input.code))) {
    run(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?`, challenge.id);
    const left = MAX_ATTEMPTS - (challenge.attempts + 1);
    throw new OtpFailure(
      left > 0 ? `That code does not match. You have ${left} attempt${left === 1 ? "" : "s"} left.` : "That code is not valid. Please request a new one.",
    );
  }

  const customer = tx(() => {
    run(`UPDATE otp_challenges SET consumed_at = ? WHERE id = ?`, nowIso(), challenge.id);
    const existing = findCustomer(input.mobile);
    if (existing) {
      if (input.name?.trim()) updateProfile(existing.id, { name: input.name.trim(), email: input.email });
      run(`UPDATE customers SET last_login_at = ? WHERE id = ?`, nowIso(), existing.id);
      return existing;
    }
    const id = upsertCustomerByMobile({
      mobile: input.mobile,
      name: input.name?.trim() || "Guest",
      email: input.email || null,
    });
    return findCustomer(input.mobile) ?? { id, name: null, mobile: input.mobile, email: null, password_hash: null, created_at: nowIso() };
  });

  return { customer, challengeId: challenge.id };
}

export async function startCustomerSession(customerId: number, mobile: string, req?: Request) {
  await createSession("customer", customerId, req);
  return { id: customerId, mobile };
}

/** Optional: attach a password once an account exists (kept out of the first-run flow). */
export async function setPassword(customerId: number, password: string) {
  if (password.length < 10) throw badRequest("Please choose a password of at least 10 characters.", { password: "Too short" });
  const { hashPassword } = await import("@/server/security/crypto");
  run(`UPDATE customers SET password_hash = ? WHERE id = ?`, await hashPassword(password), customerId);
  return { ok: true };
}

export async function loginWithPassword(mobile: string, password: string, req?: Request) {
  const customer = findCustomer(mobile);
  if (!customer?.password_hash) throw unauthorized("This number has no password set. Please sign in with a one-time code.");
  const { verifyPassword } = await import("@/server/security/crypto");
  if (!(await verifyPassword(password, customer.password_hash))) throw unauthorized("That password does not match our records.");
  run(`UPDATE customers SET last_login_at = ? WHERE id = ?`, nowIso(), customer.id);
  await createSession("customer", customer.id, req);
  return { id: customer.id, mobile: customer.mobile };
}

/** Admin sign-in — separate table, separate cookie, stricter throttle. */
export async function adminLogin(email: string, password: string, req?: Request) {
  const key = `admin-login:${email.toLowerCase()}`;
  const limit = consume(key, 6, 10 * 60 * 1000);
  if (!limit.ok) {
    throw rateLimited("Too many failed sign-in attempts. Please wait before trying again.", limit.retryAfterSec);
  }
  const admin = get<{ id: number; email: string; password_hash: string; name: string }>(
    `SELECT id, email, password_hash, name FROM admin_users WHERE lower(email) = lower(?)`,
    email,
  );
  const { verifyPassword } = await import("@/server/security/crypto");
  // Verify even when the user is unknown so timing does not confirm accounts.
  const ok = await verifyPassword(password, admin?.password_hash ?? "scrypt$16384$8$1$AAAA$AAAA");
  if (!admin || !ok) {
    throw unauthorized("Those details did not match our records. Please check and try again.");
  }
  run(`UPDATE admin_users SET last_login_at = ? WHERE id = ?`, nowIso(), admin.id);
  await createSession("admin", admin.id, req);
  consume(key, 0, 1); // reset the failure window on success
  return { id: admin.id, name: admin.name, email: admin.email };
}

export function otpAuditTrail(mobile: string, limit = 5) {
  return all<{ created_at: string; attempts: number; consumed_at: string | null }>(
    `SELECT created_at, attempts, consumed_at FROM otp_challenges WHERE mobile = ? ORDER BY id DESC LIMIT ?`,
    mobile,
    limit,
  );
}
