import { handle } from "@/server/http/handler";
import { adminLoginSchema } from "@/server/validation/schemas";
import { adminLogin } from "@/server/services/auth.service";

/**
 * Owner sign-in. Only this route and `logout` touch the admin credential store;
 * nothing else about `admin_users` is readable from a public endpoint. The
 * session cookie is httpOnly + SameSite=Lax with a 12-hour life.
 */
export const POST = handle({ auth: "public", body: adminLoginSchema, rate: { bucket: "admin-login", limit: 8, windowMs: 15 * 60_000 } }, async ({ body, req }) => {
  const admin = await adminLogin(body.email, body.password, req);
  return { ok: true, admin };
});
