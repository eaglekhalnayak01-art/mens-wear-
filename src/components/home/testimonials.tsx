import { Stars } from "@/components/ui/stars";
import { Reveal } from "@/components/ui/reveal";

export function Testimonials({
  reviews,
  average,
  count,
}: {
  reviews: { name: string; city: string; bought: string; rating: number; quote: string }[];
  average: number;
  count: number;
}) {
  return (
    <section aria-labelledby="reviews-heading" className="shop-shell py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2.5">In their words</p>
          <h2 id="reviews-heading" className="section-title">
            {count} customers, {average.toFixed(1)} stars
          </h2>
        </div>
        <p className="max-w-[40ch] text-[13px] leading-relaxed text-muted">
          Reviews are collected on WhatsApp and in store after delivery. We publish the critical ones too.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
        {reviews.map((review, index) => (
          <Reveal as="li" key={review.name + review.bought} delay={index * 70} className="h-full">
            <figure className="flex h-full flex-col rounded-[var(--radius-md)] border border-line bg-paper p-5 transition-shadow duration-300 hover:shadow-card sm:p-6">
              <Stars value={review.rating} size={13} />
              <blockquote className="mt-4 flex-1 text-[14px] leading-[1.7] text-ink-soft">“{review.quote}”</blockquote>
              <figcaption className="mt-5 border-t border-line-soft pt-4">
                <p className="text-[13px] font-semibold text-ink">{review.name}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {review.city} · bought {review.bought}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
