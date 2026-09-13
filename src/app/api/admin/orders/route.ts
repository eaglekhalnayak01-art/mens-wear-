import { handle } from "@/server/http/handler";
import { orderFilterSchema } from "@/server/validation/schemas";
import { listAdminOrders } from "@/server/repositories/orders.repository";

/** Orders table: search, status/payment filters, date range and sorting. */
export const GET = handle({ auth: "admin", query: orderFilterSchema }, async ({ query }) => listAdminOrders(query));
