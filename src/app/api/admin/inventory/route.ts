import { z } from "zod";
import { handle } from "@/server/http/handler";
import { bulkStockSchema, variantStockSchema } from "@/server/validation/schemas";
import { adjustProductStock, setVariantStock } from "@/server/repositories/products.admin";
import { listInventory } from "@/server/repositories/inventory.repository";
import { notFound } from "@/server/http/errors";
import { invalidate } from "@/server/db/query-cache";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  state: z.enum(["all", "low", "out", "ok", "hidden"]).default("all"),
  page: z.coerce.number().int().min(1).max(400).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(25),
});

/** The shop-floor table: product, SKU, size/colour rows and live stock. */
export const GET = handle({ auth: "admin", query: querySchema }, async ({ query }) => listInventory(query));

/** One size × colour at a time — the number a shopkeeper types after a delivery. */
export const PUT = handle({ auth: "admin", body: variantStockSchema }, async ({ body, admin }) => {
  const result = setVariantStock(body.variantId, body.stock, body.reason, `Dashboard · ${admin?.name ?? "Owner"}`);
  if (!result) throw notFound("That size/colour row no longer exists.");
  invalidate("products", "shop", "inventory");
  return { ok: true, ...result };
});

/** Bulk adjustment for a whole product (a new lot of the same garment arriving). */
export const POST = handle({ auth: "admin", body: bulkStockSchema }, async ({ body, admin }) => {
  const result = adjustProductStock(body.productId, body.delta, `${body.note ? `${body.note} · ` : ""}${admin?.name ?? "Owner"}`);
  invalidate("products", "shop", "inventory");
  return { ok: true, ...(result ?? {}) };
});
