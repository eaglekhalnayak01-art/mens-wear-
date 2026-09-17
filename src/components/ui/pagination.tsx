import Link from "next/link";
import { cn } from "@/lib/cn";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/**
 * Pagination is link-based (a `?page=` in the URL), so it works with JavaScript
 * off, keeps filter state in the address, and is crawlable.
 */
export function Pagination({
  page,
  pages,
  buildHref,
  className,
  summary,
}: {
  page: number;
  pages: number;
  buildHref: (page: number) => string;
  className?: string;
  summary?: React.ReactNode;
}) {
  if (pages <= 1) {
    return summary ? <div className={cn("mt-8 flex justify-center text-[13px] text-muted", className)}>{summary}</div> : null;
  }

  const window = new Set<number>([1, pages, page, page - 1, page + 1]);
  const shown = [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  shown.forEach((n, i) => {
    if (i > 0 && n - shown[i - 1] > 1) items.push("…");
    items.push(n);
  });

  return (
    <nav aria-label="Pages" className={cn("mt-10 flex flex-wrap items-center justify-between gap-4", className)}>
      {summary ? <p className="text-[13px] text-muted">{summary}</p> : <span />}
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            scroll={false}
            aria-label="Previous page"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:border-ink"
          >
            <IconChevronLeft size={16} />
          </Link>
        ) : null}
        {items.map((item, i) =>
          item === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-[13px] text-muted">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(item)}
              scroll={false}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "nums h-9 min-w-9 rounded-full px-3 text-[13px] font-medium transition-colors",
                item === page ? "bg-ink text-bone" : "border border-line bg-paper text-ink-soft hover:border-ink",
              )}
            >
              {item}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link
            href={buildHref(page + 1)}
            scroll={false}
            aria-label="Next page"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:border-ink"
          >
            <IconChevronRight size={16} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
