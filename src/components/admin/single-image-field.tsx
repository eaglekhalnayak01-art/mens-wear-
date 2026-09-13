"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { IconClose, IconImage } from "@/components/ui/icons";
import { uploadImages } from "@/lib/admin-upload";
import { cn } from "@/lib/cn";

/**
 * One image, for the logo and the two banners. Same endpoint as the product
 * gallery, so a shop owner learns one interaction, not three.
 */
export function SingleImageField({
  value,
  onChange,
  label,
  hint,
  aspect = "wide",
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  hint?: string;
  aspect?: "square" | "wide" | "tall";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratio = aspect === "square" ? "aspect-square w-[76px]" : aspect === "tall" ? "aspect-[4/5] w-[76px]" : "aspect-[16/9] w-full max-w-[260px]";

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const result = await uploadImages([file], setProgress);
      onChange(result.images[0].src);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className={cn("relative overflow-hidden rounded-[var(--radius-sm)] border bg-sand", ratio, value && "border-line", !value && "border-dashed border-line")}>
        {value ? (
          <SafeImage src={value} alt={label} sizes="260px" className="h-full w-full object-contain" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted">
            <IconImage size={18} />
          </span>
        )}
        {progress !== null ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-line">
            <span className="block h-full bg-brass transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </span>
        ) : null}
      </div>

      <div className="min-w-[180px] flex-1">
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void pick(event.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="admin-chip h-8 px-3 text-[12px]">
            {value ? "Replace image" : "Choose image"}
          </button>
          {value ? (
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-[11.5px] text-muted underline underline-offset-2 hover:text-bad">
              <IconClose size={11} /> Remove
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{error ?? hint ?? "A plain photograph, no text baked in."}</p>
        {value ? <input value={value} onChange={(event) => onChange(event.target.value.trim())} aria-label={`${label} image address`} className="admin-input mt-2 h-8 font-mono text-[11px]" /> : null}
      </div>
    </div>
  );
}
