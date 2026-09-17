import { NextResponse } from "next/server";
import { handle } from "@/server/http/handler";
import { ADMIN_COOKIE, revokeCurrentSession } from "@/server/security/sessions";

export const POST = handle({ auth: "public" }, async () => {
  await revokeCurrentSession("admin");
  // Path and Secure must match how the cookie was set (`/`, secure in prod), or the
  // browser keeps it and a signed-out owner looks still-signed-in to the edge check.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "set-cookie": `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
        "cache-control": "no-store",
      },
    },
  );
});
