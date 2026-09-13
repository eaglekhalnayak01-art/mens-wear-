"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { IconChevronLeft, IconChevronRight, IconClose, IconImage, IconStar, IconUpload } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { uploadImages } from "@/lib/admin-upload";

export type ManagedImage = { src: string; alt?: string; isPrimary?: boolean };

/**
 * Product pictures: upload, order, caption, pick the thumbnail.
 *
 * Uploads go to /api/admin/images/upload, which re-encodes every file to one 4:5
 * WebP and writes it under the upload root — the shop never trusts a browser to
 * resize, and never lets an upload land in /public.
 */
export function ImageManager({
  images,
  onChange,
  max = 8,
}: {
  images: ManagedImage[];
  onChange: (next: ManagedImage[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (files: File[]) => {
    const chosen = files.filter((file) => file.size > 0).slice(0, Math.max(0, max - images.length));
    if (chosen.length === 0) {
      setNote(images.length >= max ? `Eight photos is the limit for one product — remove one first.` : "Those files were empty.");
      return;
    }
    setProgress(0);
    setNote(null);
    try {
      const data = await uploadImages(chosen, setProgress);
      const added: ManagedImage[] = data.images.map((image, index) => ({
        src: image.src,
        alt: image.alt || "Product photo",
        isPrimary: images.length === 0 && index === 0,
      }));
      const next = [...images, ...added];
      if (!next.some((image) => image.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      onChange(next);
      setNote(
        data.failed.length > 0
          ? `${added.length} added · ${data.failed.length} refused (${data.failed[0].reason.toLowerCase()})`
          : `${added.length} photo${added.length === 1 ? "" : "s"} added — first one is the thumbnail`,
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Upload failed. Check the photo and try again.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const setPrimary = (index: number) => {
    onChange(images.map((image, position) => ({ ...image, isPrimary: position === index })));
  };

  const remove = (index: number) => {
    const next = images.filter((_, position) => position !== index);
    if (next.length > 0 && !next.some((image) => image.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  };

  const rename = (index: number, alt: string) => {
    onChange(images.map((image, position) => (position === index ? { ...image, alt } : image)));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(Array.from(event.dataTransfer.files ?? []));
        }}
        className={cn(
          "rounded-[var(--radius-md)] border border-dashed p-4 text-center transition-colors",
          dragOver ? "border-ink bg-sand" : "border-line bg-bone",
        )}
      >
        <input
          ref={inputRef}
          id="admin-images"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => void upload(Array.from(event.target.files ?? []))}
        />
        <p className="text-[12.5px] text-graphite">
          <IconImage size={16} className="mr-1.5 inline-block -mt-0.5 text-muted" />
          Drop photos here, or{" "}
          <button type="button" onClick={() => inputRef.current?.click()} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            choose from this device
          </button>
        </p>
        <p className="mt-1 text-[11px] text-muted">
          Portrait 4:5 works best. Up to {max} per product, {images.length} used. Shot on a plain background, one garment per frame.
        </p>

        {progress !== null ? (
          <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Uploading photos">
            <div className="mx-auto h-1 w-full max-w-[280px] overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brass transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Uploading… {progress}%</p>
          </div>
        ) : null}
      </div>

      {note ? <p className="text-[11.5px] text-muted">{note}</p> : null}

      {images.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] bg-sand px-3 py-2.5 text-[12px] leading-relaxed text-graphite">
          No photos yet. A product without a picture is invisible in the grid — add at least two so the hover shows a second angle.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`} className={cn("overflow-hidden rounded-[var(--radius-sm)] border bg-paper", image.isPrimary ? "border-ink" : "border-line")}>
              <div className="relative aspect-[4/5] bg-sand">
                <SafeImage src={image.src} alt={image.alt ?? ""} sizes="(max-width:640px) 50vw, 200px" className="h-full w-full object-cover" />
                {image.isPrimary ? (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-bone">
                    <IconStar size={9} /> Thumbnail
                  </span>
                ) : null}
                <span className="absolute right-1.5 top-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-bone transition-colors hover:bg-bad"
                  >
                    <IconClose size={12} />
                  </button>
                </span>
              </div>
              <div className="space-y-1.5 p-2">
                <input
                  value={image.alt ?? ""}
                  onChange={(event) => rename(index, event.target.value)}
                  placeholder="Caption for screen readers"
                  aria-label={`Caption for photo ${index + 1}`}
                  className="admin-input h-8 text-[11.5px]"
                />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier" className="admin-chip h-7 w-7 justify-center px-0 disabled:opacity-35">
                    <IconChevronLeft size={12} />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="Move later" className="admin-chip h-7 w-7 justify-center px-0 disabled:opacity-35">
                    <IconChevronRight size={12} />
                  </button>
                  {!image.isPrimary ? (
                    <button type="button" onClick={() => setPrimary(index)} className="ml-auto text-[11px] text-muted underline underline-offset-2 hover:text-ink">
                      Make thumbnail
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <IconUpload size={12} /> Photos are resized for the shop automatically; the original stays in your device&rsquo;s gallery.
      </p>
    </div>
  );
}
