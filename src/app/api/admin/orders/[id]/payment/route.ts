import { z } from "zod";
import { handle } from "@/server/http/handler";
import { setPaymentStatus } from "@/server/services/orders.service";

const idParam = z.object({ id: z.coerce.number().int().positive() });
const bodySchema = z.object({ status: z.enum(["paid", "pending", "failed"]) });

/**
 * "Money has arrived" — the owner's judgement after matching a UPI reference against
 * their bank statement. Kept separate from the delivery status on purpose.
 */
export const PATCH = handle<z.infer<typeof bodySchema>>(
  { auth: "admin", body: bodySchema },
  async ({ body, params, admin }) => setPaymentStatus(idParam.parse(params).id, body.status, admin?.name ?? "Owner"),
);
