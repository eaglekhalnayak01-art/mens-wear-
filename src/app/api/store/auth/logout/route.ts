import { NextResponse } from "next/server";
import { handle } from "@/server/http/handler";
import { CUSTOMER_COOKIE, revokeCurrentSession } from "@/server/security/sessions";

export const POST = handle({}, async () => {
  await revokeCurrentSession("customer");
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "set-cookie": `${CUSTOMER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
        "cache-control": "no-store",
      },
    },
  );
});
