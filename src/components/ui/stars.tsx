import { cn } from "@/lib/cn";
import { IconStar } from "@/components/ui/icons";

export function Stars({ value, count, className, size = 12 }: { value?: number | null; count?: number; className?: string; size?: number }) {
  if (!value) return null;
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1 text-brass", className)} title={`${value.toFixed(1)} out of 5`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <IconStar key={i} size={size} className={i <= Math.floor(rounded) ? "text-ink" : i - 0.5 <= rounded ? "text-ink/70" : "text-mist"} filled={i <= rounded} />
        ))}
      </span>
      <span className="nums text-[11.5px] font-medium text-ink-soft">{value.toFixed(1)}</span>
      {count !== undefined ? <span className="nums text-[11.5px] text-muted">({count})</span> : null}
      <span className="sr-only">{value.toFixed(1)} out of 5 stars{count !== undefined ? ` from ${count} reviews` : ""}</span>
    </span>
  );
}
