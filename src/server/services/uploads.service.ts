/**
 * Owner product-image uploads (phone or desktop).
 *
 * Everything is validated before it touches the disk: extension + real MIME
 * sniff, a hard size ceiling, then `sharp` re-encodes to a normalised aspect
 * ratio so the storefront grid stays consistent and files stay small. Files are
 * stored OUTSIDE `public/` and served through /api/media with a path check.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/server/env";
import { badRequest } from "@/server/http/errors";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB straight off a phone camera
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const WIDTH = 1400;
const HEIGHT = 1750; // 4:5 — the storefront ratio

export type StoredImage = { src: string; bytes: number; width: number; height: number; mime: string };

function sniff(buffer: Buffer): string | null {
  // Trust the bytes, not the client's Content-Type header.
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export async function saveProductImage(file: File): Promise<StoredImage> {
  if (file.size === 0) throw badRequest("That file appears to be empty.");
  if (file.size > MAX_BYTES) throw badRequest("Images must be under 12 MB. A smaller photo from your phone works best.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = sniff(buffer);
  if (!detected || !ALLOWED.has(detected)) {
    throw badRequest("Please use a JPG, PNG or WebP photo.");
  }
  if (file.type && !ALLOWED.has(file.type)) throw badRequest("Please use a JPG, PNG or WebP photo.");

  let processed: Buffer;
  let width: number;
  let height: number;
  try {
    const result = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre", background: "#f2efe9" })
      .flatten({ background: "#f2efe9" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    processed = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw badRequest("We could not read that image. Please choose another photo.");
  }

  const now = new Date();
  const dir = path.join(env.uploadDir, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  await fs.mkdir(dir, { recursive: true });

  const name = `${now.getTime().toString(36)}-${crypto.randomBytes(5).toString("hex")}.webp`;
  // realpath guard: never trust a computed path that could escape the upload root.
  const target = path.join(await fs.realpath(dir), name);
  if (!target.startsWith(await fs.realpath(env.uploadDir) + path.sep)) throw badRequest("Upload was rejected.");

  await fs.writeFile(target, processed, { flag: "wx" });

  return {
    src: `/api/media/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${name}`,
    bytes: processed.length,
    width,
    height,
    mime: "image/webp",
  };
}

export async function deleteStoredImage(src: string) {
  if (!src.startsWith("/api/media/")) return { skipped: true }; // seeded photography is never deleted
  const relative = src.replace("/api/media/", "");
  const root = await fs.realpath(env.uploadDir).catch(() => env.uploadDir);
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) return { forbidden: true };
  await fs.rm(target, { force: true });
  return { deleted: true };
}

/** Resolves a /api/media/… URL to an absolute path inside the upload root. */
export async function resolveMediaPath(relative: string): Promise<string | null> {
  const root = await fs.realpath(env.uploadDir).catch(() => null);
  if (!root) return null;
  const clean = decodeURIComponent(relative).replace(/^\/+/, "").split("?")[0];
  if (clean.includes("\0")) return null;
  const target = path.resolve(root, clean);
  if (target !== root && !target.startsWith(root + path.sep)) return null; // traversal guard
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return null;
    return target;
  } catch {
    return null;
  }
}

export const UPLOAD_LIMITS = { maxBytes: MAX_BYTES, width: WIDTH, height: HEIGHT };
