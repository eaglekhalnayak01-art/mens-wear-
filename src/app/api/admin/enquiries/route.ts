import { z } from "zod";
import { handle } from "@/server/http/handler";
import { enquiryStatusSchema } from "@/server/validation/schemas";
import { listEnquiries, setEnquiryStatus } from "@/server/repositories/enquiries.repository";
import { notFound } from "@/server/http/errors";

const querySchema = z.object({
  status: z.enum(["all", "new", "replied", "closed"]).default("new"),
  limit: z.coerce.number().int().min(5).max(200).default(50),
});

export const GET = handle({ auth: "admin", query: querySchema }, async ({ query }) => ({
  enquiries: listEnquiries({ status: query.status, limit: query.limit }),
}));

export const PATCH = handle(
  { auth: "admin", body: enquiryStatusSchema.extend({ id: z.number().int().positive() }) },
  async ({ body }) => {
    const changed = setEnquiryStatus(body.id, body.status);
    if (!changed) throw notFound("That message is not in the inbox.");
    return { ok: true };
  },
);
