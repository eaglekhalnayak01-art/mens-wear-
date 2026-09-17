import { NextResponse } from "next/server";
import { saveProductImage, UPLOAD_LIMITS } from "@/server/services/uploads.service";
import { badRequest } from "@/server/http/errors";
import { requireAdmin } from "@/server/security/guard";
import { clientIp } from "@/server/security/sessions";
import { consume } from "@/server/security/rate-limit";

export const runtime = "nodejs";

/**
 * Multipart upload endpoint used by the image manager (XHR, so it can report
 * progress). Files are re-encoded to one 4:5 WebP, checked for a real image
 * signature and written under the upload root — never to /public.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return NextResponse.json({ error: (error as Error).message, code: "unauthorized" }, { status, headers: { "cache-control": "no-store" } });
  }

  const limit = consume(`upload:${clientIp(request) ?? "local"}`, 60, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads at once. Give us a second.", code: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec), "cache-control": "no-store" } });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "We could not read that upload. Please choose the photo again.", code: "bad_request" }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "No photo came through. Try a JPG or PNG under 12 MB.", code: "bad_request" }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  if (files.length > 8) throw badRequest("Upload up to 8 photos at a time.");

  const saved: { src: string; alt: string; bytes: number; width: number; height: number }[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const file of files) {
    try {
      const image = await saveProductImage(file);
      saved.push({ src: image.src, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 80), bytes: image.bytes, width: image.width, height: image.height });
    } catch (error) {
      failed.push({ name: file.name, reason: error instanceof Error ? error.message : "Could not be processed" });
    }
  }

  if (saved.length === 0) {
    return NextResponse.json({ error: failed[0]?.reason ?? "We could not process those photos.", code: "bad_request", failed }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ ok: true, images: saved, failed, limits: UPLOAD_LIMITS }, { headers: { "cache-control": "no-store" } });
}
