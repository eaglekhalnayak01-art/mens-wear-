import { z } from "zod";
import { handle } from "@/server/http/handler";
import { orderStatusSchema } from "@/server/validation/schemas";
import { changeOrderStatus } from "@/server/services/orders.service";
import { getOrderByPublicId } from "@/server/repositories/orders.repository";
import { notFound } from "@/server/http/errors";
import type { OrderStatus } from "@/lib/order-status";

const idParam = z.object({ id: z.coerce.number().int().positive() });

/**
 * Moves an order along the lifecycle. Everything that follows — stock release on
 * cancellation, the event log, timestamps, invalidation — lives in the service,
 * so no screen can mark an order delivered and forget to do the bookkeeping.
 */
export const PATCH = handle({ auth: "admin", body: orderStatusSchema }, async ({ body, params, admin }) => {
  const { id } = idParam.parse(params);
  const before = getOrderByPublicId(id);
  if (!before) throw notFound("That order is not in the book.");

  const result = changeOrderStatus(id, body.status as OrderStatus, { type: "admin", name: admin?.name ?? "Owner" }, { note: body.note, reason: body.reason });
  const after = getOrderByPublicId(id);

  return { ok: true, order: after, restocked: result?.restocked ?? false, previous: before.status };
});
