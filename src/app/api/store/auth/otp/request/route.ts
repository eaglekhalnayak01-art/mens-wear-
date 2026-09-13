import { handle } from "@/server/http/handler";
import { otpRequestSchema } from "@/server/validation/schemas";
import { requestOtp } from "@/server/services/auth.service";
import { maskMobile } from "@/lib/format";

/**
 * Starts an OTP challenge. The code is only echoed back when
 * `AUTH_DEMO_RETURN_OTP` is on (development), so the demo can be finished without
 * an SMS provider while production never leaks it into the response.
 */
export const POST = handle(
  {
    body: otpRequestSchema,
    rate: { bucket: "otp-request", limit: 6, windowMs: 10 * 60_000, keyFrom: (body) => String(body?.mobile ?? "") },
  },
  async ({ body }) => {
    const outcome = await requestOtp(body.mobile, body.purpose);
    return {
      mobile: maskMobile(outcome.mobile),
      purpose: body.purpose,
      isNewCustomer: outcome.isNewCustomer,
      resendAfterSeconds: outcome.resendAfterSeconds,
      expiresInMinutes: 10,
      devCode: outcome.devCode,
    };
  },
);
