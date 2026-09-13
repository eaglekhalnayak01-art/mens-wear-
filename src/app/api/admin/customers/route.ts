import { z } from "zod";
import { handle } from "@/server/http/handler";
import { listCustomers } from "@/server/repositories/customers.repository";

const querySchema = z.object({
  q: z.string().trim().max(60).optional(),
  sort: z.enum(["recent", "spenders", "newest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(400).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(25),
});

/** Who has bought what: name, number, orders, spend, last order, joined. */
export const GET = handle({ auth: "admin", query: querySchema }, async ({ query }) => listCustomers(query));
