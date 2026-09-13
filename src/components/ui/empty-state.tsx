import { cn } from "@/lib/cn";

/**
 * Empty, no-result and gone-wrong states. These are written the way the shop
 * would talk to a customer — no stack traces, no "Error 500", and always a way
 * forward.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
  tone?: "neutral" | "warn" | "bad";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed bg-paper/60 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        tone === "neutral" && "border-line",
        tone === "warn" && "border-warn/30 bg-warn-tint/40",
        tone === "bad" && "border-bad/30 bg-bad-tint/40",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "mb-3 grid h-11 w-11 place-items-center rounded-full",
            tone === "bad" ? "bg-bad-tint text-bad" : tone === "warn" ? "bg-warn-tint text-warn" : "bg-sand text-ink-soft",
          )}
        >
          {icon}
        </span>
      ) : null}
      <h3 className={cn("display text-ink", compact ? "text-[17px]" : "text-[20px]")}>{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted">{description}</p> : null}
      {action || secondaryAction ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">{action}{secondaryAction}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[var(--radius-sm)]", className)} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-xs)]" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3.5 w-1/3" />
    </div>
  );
}

export function RowSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="divide-y divide-line-soft" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 && "w-4/5", c === cols - 1 && "w-1/2")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InlineNotice({
  tone = "info",
  children,
  className,
  onClose,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[13px] leading-relaxed",
        tone === "info" && "border-line bg-sand/60 text-ink-soft",
        tone === "good" && "border-good/25 bg-good-tint text-good",
        tone === "warn" && "border-warn/25 bg-warn-tint text-warn",
        tone === "bad" && "border-bad/25 bg-bad-tint text-bad",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="-mr-1 -mt-0.5 rounded p-1 opacity-70 transition-opacity hover:opacity-100">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
