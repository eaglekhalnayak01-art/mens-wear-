import { cn } from "@/lib/cn";

export type BadgeTone = "ink" | "brass" | "good" | "warn" | "bad" | "quiet" | "outline";

const tones: Record<BadgeTone, string> = {
  ink: "bg-ink text-bone",
  brass: "bg-brass-tint text-brass-deep border border-brass/20",
  good: "bg-good-tint text-good border border-good/20",
  warn: "bg-warn-tint text-warn border border-warn/25",
  bad: "bg-bad-tint text-bad border border-bad/20",
  quiet: "bg-sand text-ink-soft border border-line",
  outline: "bg-transparent text-ink-soft border border-line",
};

export function Badge({
  children,
  tone = "quiet",
  className,
  uppercase = true,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-semibold leading-none tracking-[0.08em] whitespace-nowrap",
        uppercase && "uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small pill used for order states across the storefront and dashboard. */
export function StatusPill({
  tone = "quiet",
  children,
  dot = true,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const dotColor = {
    ink: "bg-bone",
    brass: "bg-brass",
    good: "bg-good",
    warn: "bg-warn",
    bad: "bg-bad",
    quiet: "bg-muted",
    outline: "bg-muted",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} /> : null}
      {children}
    </span>
  );
}
