import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconArrowRight, IconSearch } from "@/components/ui/icons";
import { getSettings, getStrip } from "@/server/queries";

/**
 * A 404 should still be a shop. One sentence, the two things a lost customer
 * actually wants (search and the rails), and three real products — no illustration,
 * no joke about the page being "misplaced".
 */
export default async function NotFound() {
  const settings = getSettings();
  const suggestions = getStrip("bestsellers", 3);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <p className="eyebrow">404 · nothing here</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-[30px] leading-[1.1] text-ink sm:text-[40px]">
        That page is not part of the shop
      </h1>
      <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-graphite">
        The link may be old, or a size may have sold out and been retired. {settings.shopName} keeps everything that is still
        on the rail under Shop — start there, or search for the piece.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link href="/shop">
          <Button variant="solid" size="md" iconRight={<IconArrowRight size={15} />}>
            Shop everything
          </Button>
        </Link>
        <Link href="/collections/new-arrivals">
          <Button variant="outline" size="md" iconLeft={<IconSearch size={15} />}>
            See what just landed
          </Button>
        </Link>
        <Link href="/track" className="link-line ml-1 text-[13.5px]">
          Track an order
        </Link>
      </div>

      {suggestions.length > 0 ? (
        <section className="mt-12 border-t border-line pt-6" aria-label="Suggested products">
          <p className="eyebrow">What is leaving the shop fastest</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3">
            {suggestions.map((product) => (
              <li key={product.id}>
                <Link href={`/product/${product.slug}`} className="group block">
                  <span className="block overflow-hidden rounded-[var(--radius-sm)] bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image.src}
                      alt={product.image.alt}
                      loading="lazy"
                      className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="mt-2.5 block text-[13.5px] text-ink group-hover:underline">{product.name}</span>
                  <span className="nums mt-0.5 block text-[12.5px] text-muted">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
