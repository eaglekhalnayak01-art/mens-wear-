import { handle } from "@/server/http/handler";
import { profileUpdateSchema } from "@/server/validation/schemas";
import { customerProfile, updateProfile } from "@/server/repositories/customers.repository";
import { listOrdersForCustomer } from "@/server/repositories/orders.repository";
import { invalidate } from "@/server/db/query-cache";

/** Profile + order history for the account area. Numbers come from the DB, not the client. */
export const GET = handle({ auth: "customer" }, async ({ customer }) => {
  const profile = customerProfile(customer!.id);
  return { profile, orders: listOrdersForCustomer(customer!.id, 20) };
});

export const PUT = handle({ auth: "customer", body: profileUpdateSchema }, async ({ body, customer }) => {
  updateProfile(customer!.id, { name: body.name, email: body.email });
  invalidate("customer");
  return { ok: true, profile: customerProfile(customer!.id) };
});
