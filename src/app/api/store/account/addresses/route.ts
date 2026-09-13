import { z } from "zod";
import { handle } from "@/server/http/handler";
import { addressSchema } from "@/server/validation/schemas";
import { deleteAddress, listAddresses, saveAddress } from "@/server/repositories/customers.repository";
import { invalidate } from "@/server/db/query-cache";

/** Saved addresses for the signed-in customer only — the id is scoped to the session. */
export const GET = handle({ auth: "customer" }, async ({ customer }) => ({
  addresses: listAddresses(customer!.id),
}));

const bodySchema = addressSchema.extend({ id: z.number().int().positive().optional() });

export const POST = handle({ auth: "customer", body: bodySchema }, async ({ body, customer }) => {
  const id = saveAddress(customer!.id, body, body.id);
  invalidate("customer");
  return { ok: true, id, addresses: listAddresses(customer!.id) };
});

export const DELETE = handle(
  { auth: "customer", body: z.object({ id: z.number().int().positive() }) },
  async ({ body, customer }) => {
    const changes = deleteAddress(customer!.id, body.id);
    invalidate("customer");
    return { ok: changes > 0 };
  },
);
