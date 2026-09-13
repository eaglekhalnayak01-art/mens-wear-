import Link from "next/link";

/** Compact trail — rendered on listings and product pages, never on the home page. */
export function Breadcrumb({ items, className }: { items: { name: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
        {items.map((item, index) => (
          <li key={item.name} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="transition-colors hover:text-ink">
                {item.name}
              </Link>
            ) : (
              <span className="line-clamp-1 text-ink-soft">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
