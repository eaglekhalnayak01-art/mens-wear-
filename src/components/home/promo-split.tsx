import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Two offers side by side — the "special offers" slot without a carousel,
 * a countdown or a gradient. Static, legible, and editable from Settings.
 */
export function PromoSplit({
  primary,
  secondary,
}: {
  primary: { eyebrow: string; title: string; text: string; image: string; href: string; cta: string; tone?: "dark" | "light" };
  secondary: { eyebrow: string; title: string; text: string; image: string; href: string; cta: string; tone?: "dark" | "light" };
}) {
  return (
    <section aria-label="Offers" className="shop-shell py-14 md:py-16">
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {[primary, secondary].map((promo, index) => {
          const dark = promo.tone !== "light";
          return (
            <article
              key={promo.title}
              className={`group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[var(--radius-md)] sm:min-h-[340px] ${
                index === 0 ? "bg-ink" : "bg-sand"
              }`}
            >
              <SafeImage
                src={promo.image}
                alt=""
                className="absolute inset-0 h-full w-full opacity-[0.42] transition-transform duration-[900ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-[1.035]"
                sizes="(max-width: 768px) 100vw, 50vw"
                imgClassName="object-cover"
              />
              <span className={`pointer-events-none absolute inset-0 ${dark ? "bg-gradient-to-t from-ink/85 via-ink/45 to-transparent" : "bg-gradient-to-t from-ink/70 via-ink/25 to-transparent"}`} />
              <div className="relative p-6 sm:p-7">
                <p className={`eyebrow ${dark ? "text-bone/60" : "text-bone/70"}`}>{promo.eyebrow}</p>
                <h3 className={`mt-3 max-w-[22ch] text-[clamp(1.4rem,1.05rem+1.1vw,2rem)] leading-[1.1] ${dark ? "text-bone" : "text-bone"}`}>{promo.title}</h3>
                <p className={`mt-3 max-w-[42ch] text-[13.5px] leading-relaxed ${dark ? "text-bone/75" : "text-bone/80"}`}>{promo.text}</p>
                <Link
                  href={promo.href}
                  className={`mt-6 inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] px-4 text-[11.5px] font-semibold uppercase tracking-[0.09em] transition-colors ${
                    dark ? "bg-bone text-ink hover:bg-white" : "bg-bone/95 text-ink hover:bg-bone"
                  }`}
                >
                  {promo.cta}
                  <IconArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
