import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { placeholderImage } from "@/lib/placeholder";
import { money } from "@/lib/format";
import type { CategoryRow } from "@/server/repositories/categories.repository";

/**
 * Category tiles. Photography where the shoot covered it, a clean typographic
 * tile otherwise — never a grey box with a "no image" shrug.
 */
export function CategoryRail({ categories }: { categories: CategoryRow[] }) {
  const tiles = categories.slice(0, 8);
  return (
    <section aria-labelledby="categories-heading" className="shop-shell py-14 md:py-20">
      <div className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2.5">Browse the shop</p>
          <h2 id="categories-heading" className="section-title">
            What men come in for
          </h2>
        </div>
        <Link href="/shop" className="link-line hidden shrink-0 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] sm:inline-block">
          All pieces
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((category, index) => (
          <li key={category.slug} className={index === 0 ? "col-span-2 row-span-2 sm:col-span-1 lg:col-span-2" : undefined}>
            <Link
              href={`/collections/${category.slug}`}
              className="group relative flex h-full flex-col justify-end overflow-hidden rounded-[var(--radius-xs)] bg-sand"
            >
              <SafeImage
                src={category.image ?? placeholderImage(category.slug)}
                alt=""
                className={index === 0 ? "aspect-[4/3] w-full lg:aspect-[16/11]" : "aspect-[4/5] w-full"}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/62 via-ink/8 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-4">
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight text-bone sm:text-[16px]">{category.name}</span>
                  <span className="mt-1 block text-[11.5px] text-bone/75">
                    {category.count > 0 ? `${category.count} pieces` : "New lot arriving"}
                    {category.priceFrom ? ` · from ${money(category.priceFrom)}` : ""}
                  </span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bone/15 text-bone backdrop-blur-sm transition-[transform,background-color] duration-300 group-hover:translate-x-0.5 group-hover:bg-bone/25">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M5 12h13m-4.5-5L18.5 12 13.5 17" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
