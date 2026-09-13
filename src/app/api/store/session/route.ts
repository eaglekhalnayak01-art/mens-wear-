import { handle } from "@/server/http/handler";
import { currentCustomer } from "@/server/security/guard";
import { customerProfile } from "@/server/repositories/customers.repository";

/**
 * Read-only session probe for the header/account UI. Returns `null` for guests —
 * browsing is never gated, so this is informational only and holds no secrets.
 */
export const GET = handle({}, async () => {
  const customer = await currentCustomer();
  if (!customer) return { customer: null };
  const profile = customerProfile(customer.id);
  return {
    customer: {
      id: customer.id,
      name: profile?.name ?? customer.name,
      mobile: customer.mobile,
      email: profile?.email ?? customer.email,
      stats: profile ? { orders: profile.orders, spent: profile.spent, open: profile.open, lastOrderAt: profile.lastOrderAt } : null,
    },
  };
});
