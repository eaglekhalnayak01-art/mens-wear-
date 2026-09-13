"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight, IconZoomIn } from "@/components/ui/icons";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/cn";
import type { ImageRef } from "@/server/repositories/types";

/**
 * Product gallery: one large frame, thumbnails beneath, arrow keys and swipe to
 * move. The hover "zoom" is a transform on the same image rather than a second
 * high-res download, so it costs nothing on mobile and works offline.
 */
export function Gallery({ images, alt, badges }: { images: ImageRef[]; alt: string; badges?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((delta: number) => {
    setIndex((current) => {
      const next = current + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }, [images.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const single = images.length <= 1;

  return (
    <div className="lg:sticky lg:top-[104px]">
      <div
        className="zoom-frame group relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-xs)] bg-sand"
        onMouseMove={(event) => {
          if (!zoomed) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
        }}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onTouchStart={(event) => {
          touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
        onTouchEnd={(event) => {
          if (!touch.current) return;
          const dx = event.changedTouches[0].clientX - touch.current.x;
          const dy = event.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        {images.map((image, i) => (
          <SafeImage
            key={image.src}
            src={image.src}
            alt={i === index ? alt : ""}
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority={i === 0}
            className={cn(
              "absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
              zoomed && "scale-[1.6]",
            )}
            style={{ transformOrigin: origin }}
          />
        ))}

        {badges ? <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">{badges}</div> : null}

        {!single ? (
          <>
            <div className="absolute inset-x-0 bottom-0 hidden justify-between p-3 group-hover:flex">
              <IconButton label="Previous photo" onClick={() => go(-1)} className="border-transparent bg-bone/90 shadow-sm hover:bg-bone">
                <IconChevronLeft size={17} />
              </IconButton>
              <IconButton label="Next photo" onClick={() => go(1)} className="border-transparent bg-bone/90 shadow-sm hover:bg-bone">
                <IconChevronRight size={17} />
              </IconButton>
            </div>
            <p className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
              <IconZoomIn size={12} /> Move to zoom
            </p>
          </>
        ) : null}
      </div>

      {!single ? (
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} of ${images.length}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block w-[62px] overflow-hidden rounded-[var(--radius-xs)] border transition-all sm:w-[72px]",
                  i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <SafeImage src={image.src} alt="" sizes="72px" className="aspect-[4/5] w-full" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
