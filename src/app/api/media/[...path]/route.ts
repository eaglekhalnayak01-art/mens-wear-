import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveMediaPath } from "@/server/services/uploads.service";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

/**
 * Serves uploaded imagery from outside the public folder. The path is resolved
 * against the upload root and rejected unless it stays inside it, so `..`
 * traversal and symlink escapes cannot reach the filesystem.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const relative = (segments ?? []).join("/");

  let file: string | null = null;
  try {
    file = await resolveMediaPath(`/${relative}`);
  } catch {
    file = null;
  }
  if (!file) {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
  }

  try {
    const [buffer, stat] = await Promise.all([fs.readFile(file), fs.stat(file)]);
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;
    const weak = request.headers.get("if-none-match");
    if (weak === etag) return new NextResponse(null, { status: 304, headers: { etag, "cache-control": "public, max-age=31536000, immutable" } });

    return new NextResponse(buffer, {
      headers: {
        "content-type": type,
        "content-length": String(buffer.length),
        "cache-control": "public, max-age=31536000, immutable",
        etag,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
}
