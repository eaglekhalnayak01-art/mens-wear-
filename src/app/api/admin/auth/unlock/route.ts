import { handle } from "@/server/http/handler";
import { unlockAdminAccount } from "@/server/services/auth.service";
import { reset } from "@/server/security/rate-limit";

/**
 * Clears the "too many wrong passwords" pause for the signed-in owner, plus the
 * per-IP throttle. Only reachable with a valid session — an attacker who is locked
 * out cannot unlock themselves.
 */
export const POST = handle({ auth: "admin" }, async ({ admin, req }) => {
  unlockAdminAccount(admin!.id);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  reset(`admin-login:${admin!.email.toLowerCase()}`);
  reset(`admin-login:${ip}`);
  return { ok: true };
});
