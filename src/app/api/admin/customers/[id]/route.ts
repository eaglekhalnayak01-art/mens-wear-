import { z } from "zod";
import { handle } from "@/server/http/handler";
import { customerDetail } from "@/server/repositories/customers.repository";
import { notFound } from "@/server/http/errors";

const idParam = z.object({ id: z.coerce.number().int().positive() });

/** One customer's book: profile, addresses and every order they are on. */
export const GET = handle({ auth: "admin" }, async ({ params }) => {
  const { id } = idParam.parse(params);
  const detail = customerDetail(id);
  if (!detail) throw notFound("No customer with that id.");
  return { customer: detail };
});
