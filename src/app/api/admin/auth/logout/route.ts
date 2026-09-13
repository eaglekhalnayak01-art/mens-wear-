import { NextResponse } from "next/server";
import { handle } from "@/server/http/handler";
import { ADMIN_COOKIE, revokeCurrentSession } from "@/server/security/sessions";

export const POST = handle({ auth: "public" }, async () => {
  await revokeCurrentSession("admin");
  return NextResponse.json(
    { ok: true },
    { headers: { "set-cookie": `${ADMIN_COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; SameSite=Lax`, "cache-control": "no-store" } },
  );
});
