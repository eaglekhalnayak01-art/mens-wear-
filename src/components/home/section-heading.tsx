import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  align = "between",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  href?: string;
  hrefLabel?: string;
  align?: "between" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "between" ? "sm:flex-row sm:items-end sm:justify-between" : "items-center text-center",
        className,
      )}
    >
      <div className={cn("min-w-0", align === "center" && "max-w-[52ch]")}>
        {eyebrow ? <p className="eyebrow mb-2.5">{eyebrow}</p> : null}
        <h2 className="section-title text-ink">{title}</h2>
        {description ? (
          <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-graphite">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 pb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink"
        >
          <span className="link-line">{hrefLabel}</span>
          <IconArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}
