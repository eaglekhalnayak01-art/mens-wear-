import { handle } from "@/server/http/handler";
import { otpVerifySchema } from "@/server/validation/schemas";
import { startCustomerSession, verifyOtp } from "@/server/services/auth.service";

/**
 * Verifies the code and opens a session cookie (httpOnly, SameSite=Lax, 30 days).
 * No token is returned in the body — the cookie is the only proof of identity, so
 * nothing a script can read is usable as a credential.
 */
export const POST = handle(
  { body: otpVerifySchema, rate: { bucket: "otp-verify", limit: 10, windowMs: 10 * 60_000, keyFrom: (body) => String(body?.mobile ?? "") } },
  async ({ body, req }) => {
    const { customer } = await verifyOtp({ mobile: body.mobile, code: body.code, name: body.name, email: body.email });
    await startCustomerSession(customer.id, customer.mobile, req);
    return { ok: true, customer: { id: customer.id, name: customer.name, mobile: customer.mobile, email: customer.email } };
  },
);
