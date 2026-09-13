import { handle } from "@/server/http/handler";
import { settingsSchema } from "@/server/validation/schemas";
import { readSettings, writeSettings } from "@/server/repositories/settings.repository";
import { invalidate } from "@/server/db/query-cache";

/**
 * Shop settings. GET is admin-only (the public slice lives on /api/store/settings);
 * PUT validates the whole object before a single key is written, so a half-saved
 * configuration is not possible.
 */
export const GET = handle({ auth: "admin" }, async () => ({ settings: readSettings() }));

export const PUT = handle({ auth: "admin", body: settingsSchema }, async ({ body }) => {
  writeSettings(body as Record<string, never>);
  invalidate("settings", "shop", "products");
  return { ok: true, settings: readSettings() };
});
