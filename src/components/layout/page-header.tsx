import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Compact page opener used by every listing/section page so the rhythm
 * (eyebrow → title → line of copy → rule) is identical across the storefront.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
  meta,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: { name: string; href?: string }[];
  meta?: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="shop-shell py-8 md:py-11">
        {breadcrumb ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
              {breadcrumb.map((crumb, index) => (
                <li key={crumb.name} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="transition-colors hover:text-ink">
                      {crumb.name}
                    </Link>
                  ) : (
                    <span className="text-ink-soft">{crumb.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[62ch]">
            {eyebrow ? <p className="eyebrow mb-2.5">{eyebrow}</p> : null}
            <h1 className="section-title">{title}</h1>
            {description ? <p className="mt-3 max-w-[64ch] text-[14.5px] leading-[1.7] text-graphite">{description}</p> : null}
            {meta ? <p className="nums mt-3 text-[12.5px] text-muted">{meta}</p> : null}
          </div>
          {aside ? <div className="flex items-center gap-2">{aside}</div> : null}
        </div>
      </div>
    </header>
  );
}

export function SectionCta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">
      <span className="link-line">{label}</span>
      <IconArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
