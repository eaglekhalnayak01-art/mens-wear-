import { z } from "zod";
import { handle } from "@/server/http/handler";
import { changeAdminPassword } from "@/server/services/auth.service";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(12, "Use at least 12 characters").max(200),
});

/**
 * Owner password change. Sessions are revoked on success, so the response says what
 * happens next instead of pretending the user stays signed in.
 */
export const POST = handle<z.infer<typeof bodySchema>>(
  { auth: "admin", body: bodySchema, rate: { bucket: "admin-password", limit: 5, windowMs: 15 * 60_000 } },
  async ({ body, admin, req }) => changeAdminPassword(admin!.id, body.currentPassword, body.newPassword, req),
);
