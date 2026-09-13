import { handle } from "@/server/http/handler";
import { readSettings } from "@/server/repositories/settings.repository";
import { sendTestAlert } from "@/server/services/notifications.service";

/**
 * Settings → “Send a test alert”. Writes one inbox row through the same code path an
 * order uses, so what the owner sees here is exactly what an order will look like.
 */
export const POST = handle({ auth: "admin", rate: { bucket: "alert-test", limit: 10, windowMs: 10 * 60_000 } }, async () =>
  sendTestAlert(readSettings()),
);
