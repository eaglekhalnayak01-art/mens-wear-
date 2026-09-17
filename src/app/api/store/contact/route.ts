import { z } from "zod";
import { handle } from "@/server/http/handler";
import { contactSchema } from "@/server/validation/schemas";
import { createEnquiry } from "@/server/repositories/enquiries.repository";
import { readSettings } from "@/server/repositories/settings.repository";
import { rateLimited } from "@/server/http/errors";
import { consume } from "@/server/security/rate-limit";

/**
 * Contact form. Messages are stored for the owner and echoed to the log; the
 * response tells the shopper what happens next rather than just saying "ok".
 */
const bodySchema = contactSchema.extend({
  orderRef: z.string().trim().max(40).optional(),
  honeypot: z.string().max(0).optional(),
});

export const POST = handle({ body: bodySchema }, async ({ body, req }) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = consume(`contact:${ip}`, 5, 30 * 60_000);
  if (!limit.ok) throw rateLimited("You have sent a few messages just now. Please use WhatsApp — we answer within a few minutes.", limit.retryAfterSec);

  if (body.honeypot) return { ok: true }; // bots get a fake success, silently

  createEnquiry({
    name: body.name,
    mobile: body.mobile,
    email: body.email,
    topic: body.orderRef ? "order" : body.topic,
    message: body.orderRef ? `${body.message}\n\n(order ${body.orderRef})` : body.message,
  });

  const settings = readSettings();
  return {
    ok: true,
    replyBy: settings.hours,
    whatsapp: settings.whatsappEnabled ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : null,
  };
});
