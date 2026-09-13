import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Reveal } from "@/components/ui/reveal";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Brand story panel. This is the section that stops a store page reading like a
 * template: real sentences, a photograph from the shop floor, no stock metrics.
 */
export function BrandStory({
  title,
  story,
  points,
  image,
  foundedYear,
  city,
}: {
  title: string;
  story: string;
  points: { title: string; text: string }[];
  image: string;
  foundedYear: string;
  city: string;
}) {
  return (
    <section aria-labelledby="story-heading" className="border-y border-line bg-paper">
      <div className="shop-shell grid gap-10 py-14 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <Reveal className="relative order-2 lg:order-1">
          <SafeImage src={image} alt="Tailoring detail at the shop" className="aspect-[4/3] w-full rounded-[var(--radius-xs)]" sizes="(max-width: 1024px) 100vw, 45vw" priority={false} />
          <div className="absolute -bottom-5 -right-2 hidden w-[42%] rounded-[var(--radius-xs)] border border-line bg-bone px-5 py-4 shadow-card sm:block lg:-right-6">
            <p className="eyebrow">Since</p>
            <p className="nums mt-1 font-display text-[26px] leading-none text-ink">{foundedYear}</p>
            <p className="mt-2 text-[12px] leading-snug text-muted">
              {points.length} of the same promise, still on {city}’s high street
            </p>
          </div>
        </Reveal>

        <Reveal className="order-1 max-w-[54ch] lg:order-2">
          <p className="eyebrow">The shop</p>
          <h2 id="story-heading" className="section-title mt-3">
            {title}
          </h2>
          <p className="mt-5 text-[15px] leading-[1.75] text-graphite">{story}</p>

          <dl className="mt-8 space-y-5 border-t border-line pt-6">
            {points.map((point) => (
              <div key={point.title}>
                <dt className="flex items-baseline gap-2.5 text-[13.5px] font-semibold text-ink">
                  <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-brass" />
                  {point.title}
                </dt>
                <dd className="mt-1.5 pl-[15px] text-[13.5px] leading-relaxed text-muted">{point.text}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/about"
            className="group mt-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink"
          >
            <span className="link-line">Read our story</span>
            <IconArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
