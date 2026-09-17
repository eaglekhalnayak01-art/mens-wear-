import { NextRequest, NextResponse } from "next/server";
import { renderPlaceholderSvg } from "@/lib/garment-art";

export const dynamic = "force-dynamic";

/**
 * Designed placeholder artwork for products whose photography is pending.
 * Cached hard (immutable + long TTL) because the output only depends on the seed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ seed: string }> }) {
  const { seed } = await params;
  const raw = decodeURIComponent(seed).replace(/\.svg$/i, "").slice(0, 90);
  const { searchParams } = new URL(request.url);

  const svg = renderPlaceholderSvg({
    seed: raw,
    name: searchParams.get("name") ?? undefined,
    kind: searchParams.get("kind") ?? undefined,
  });

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
