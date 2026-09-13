import Link from "next/link";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";

/** Shared page furniture for every admin screen: title, one-line context, actions. */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[24px] leading-tight text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[68ch] text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * A stat card is deliberately boring: label, number, one comparison, optional link.
 * The owner reads these standing at the counter, on a phone, in daylight.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "ink",
  suffix,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "ink" | "warn" | "bad" | "good";
  /** Money values pass "₹" through so the number stays tabular and readable. */
  suffix?: "money";
}) {
  const display = typeof value === "number" ? (suffix === "money" ? money(value) : value.toLocaleString("en-IN")) : value;
  const toneClass = {
    ink: "text-ink",
    warn: "text-warn",
    bad: "text-bad",
    good: "text-good",
  }[tone];

  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={cn("admin-figure mt-2.5", toneClass)}>{display}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-snug text-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="admin-card block p-4 transition-[border-color,transform] duration-[var(--dur-fast)] hover:-translate-y-px hover:border-ink sm:p-5">
        {body}
      </Link>
    );
  }
  return <div className="admin-card p-4 sm:p-5">{body}</div>;
}

export function AdminEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-ink">{title}</p>
      <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
