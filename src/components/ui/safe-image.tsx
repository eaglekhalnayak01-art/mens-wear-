"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Every product photo in the app goes through this: lazy by default, a soft
 * skeleton while the bytes arrive, a gentle fade once decoded, and a designed
 * fallback (never a broken-image icon) if a file is missing.
 *
 * Give each instance a `key` when the `src` changes (gallery thumbnails) so the
 * loading state resets with the new image.
 */
export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  imgClassName,
  sizes,
  priority = false,
  fill = false,
  style,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const isSvgPlaceholder = src.startsWith("/api/placeholder");
  const useFill = fill || !width;

  return (
    <div className={cn("relative overflow-hidden bg-sand", className)} style={style}>
      {state === "loading" ? <div className="absolute inset-0 skeleton" aria-hidden="true" /> : null}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-sand text-center">
          <span className="px-3 text-[11px] uppercase tracking-[0.14em] text-muted">Photo unavailable</span>
        </div>
      ) : null}
      <Image
        // Placeholder SVGs must skip the optimiser (it cannot transform SVG).
        unoptimized={isSvgPlaceholder}
        src={src}
        alt={alt}
        width={width ?? 1120}
        height={height ?? 1400}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={cn(
          "transition-opacity duration-500 ease-[cubic-bezier(.22,.61,.36,1)] object-cover",
          useFill ? "absolute inset-0 h-full w-full" : "h-auto w-full",
          state === "loading" ? "opacity-0" : "opacity-100",
          imgClassName,
        )}
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
      />
    </div>
  );
}
