import { handle } from "@/server/http/handler";
import { nowIso, run } from "@/server/db";
import { createSession } from "@/server/security/sessions";

/**
 * "I left the dashboard open on the shop computer."
 *
 * Revokes every admin session this account has, then mints a new one for this
 * request — so every other browser drops at once while the owner keeps working.
 */
export const DELETE = handle({ auth: "admin" }, async ({ admin, req }) => {
  const { changes } = run(
    `UPDATE auth_sessions SET revoked_at = ?
      WHERE subject_type = 'admin' AND subject_id = ? AND revoked_at IS NULL`,
    nowIso(),
    admin!.id,
  );
  await createSession("admin", admin!.id, req);
  return { ok: true, revoked: changes, message: "Signed out everywhere else. This window stays open." };
});
