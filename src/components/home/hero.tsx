import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Hero: an editorial split, not a centred headline over a dark photo.
 * Type on the left on the shop's bone background, campaign frame on the right,
 * and both calls to action present from the first paint.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt,
  foundedYear,
  city,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  foundedYear: string;
  city: string;
}) {
  const [line1, line2] = title.split("\n");

  return (
    <section className="relative overflow-hidden border-b border-line bg-bone" aria-label="New season at the shop">
      <div className="shop-shell grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:py-0">
        <div className="order-2 max-w-[46ch] pb-10 lg:order-1 lg:py-20">
          <p className="eyebrow flex items-center gap-2.5">
            <span className="inline-block h-px w-8 bg-brass" />
            {eyebrow}
          </p>
          <h1 className="mt-5 text-[clamp(2.3rem,1.3rem+4.4vw,4.1rem)] leading-[1.02] tracking-[-0.022em] text-ink">
            {line1}
            {line2 ? (
              <>
                <br />
                <span className="italic text-ink-soft">{line2}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-graphite sm:text-[16px]">{subtitle}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="group inline-flex h-12 items-center gap-3 rounded-[var(--radius-sm)] bg-ink px-7 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-bone transition-[background-color,transform] duration-200 hover:bg-ink-soft active:translate-y-[0.5px]"
            >
              Shop now
              <IconArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/collections/new-arrivals"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-sm)] border border-ink/25 px-6 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors duration-200 hover:border-ink hover:bg-ink/[0.04]"
            >
              Explore collection
            </Link>
          </div>

          <dl className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5 text-[12px]">
            <div>
              <dt className="text-muted">Est.</dt>
              <dd className="nums mt-0.5 font-semibold text-ink">{foundedYear} · {city}</dd>
            </div>
            <div>
              <dt className="text-muted">In-house</dt>
              <dd className="mt-0.5 font-semibold text-ink">Cut, check & hem</dd>
            </div>
            <div>
              <dt className="text-muted">Delivery</dt>
              <dd className="mt-0.5 font-semibold text-ink">2–4 days, COD</dd>
            </div>
          </dl>
        </div>

        <div className="relative order-1 lg:order-2 lg:h-[min(86vh,760px)] lg:py-0">
          <SafeImage
            src={image}
            alt={imageAlt}
            priority
            className="h-[54vh] w-full rounded-[var(--radius-xs)] object-cover sm:h-[62vh] lg:h-full"
            sizes="(max-width: 1024px) 100vw, 46vw"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-ink/20 to-transparent lg:block" />
          <Link
            href="/collections/formal-wear"
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-bone/92 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.09em] text-ink backdrop-blur transition-colors hover:bg-bone sm:bottom-6 sm:left-6"
          >
            Suiting, made in-house
            <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
