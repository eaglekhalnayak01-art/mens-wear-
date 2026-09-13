import { Suspense } from "react";
import { Hero } from "@/components/home/hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { CategoryRail } from "@/components/home/category-rail";
import { CollectionStrip } from "@/components/home/collection-strip";
import { PromoSplit } from "@/components/home/promo-split";
import { BrandStory } from "@/components/home/brand-story";
import { Testimonials } from "@/components/home/testimonials";
import { TrendingRail } from "@/components/home/trending-rail";
import { SectionHeading } from "@/components/home/section-heading";
import { getCategories, getSettings, getStrip } from "@/server/queries";
import { REVIEWS, BRAND_POINTS } from "@/lib/shop-content";
import { averageRating } from "@/lib/shop-stats";

// A short revalidation window keeps the storefront on the edge while staying
// within a minute of whatever the owner just published from the dashboard.
export const revalidate = 60;

export default function HomePage() {
  const settings = getSettings();
  const newArrivals = getStrip("new", 4);
  const trending = getStrip("bestsellers", 8);
  const featured = getStrip("featured", 4);
  const categories = getCategories();

  return (
    <>
      <Hero
        eyebrow={settings.heroEyebrow}
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
        image={settings.heroImage || "/images/hero-editorial.jpg"}
        imageAlt="Model wearing a charcoal tailored suit from Mens Wear"
        foundedYear={settings.foundedYear}
        city={settings.city}
      />

      <TrustStrip />

      <CategoryRail categories={categories.filter((c) => c.parent_id === null)} />

      <CollectionStrip
        background="paper"
        eyebrow="Just landed"
        title="New arrivals"
        description="Fresh lots from the last two weeks — small runs, so the sizes you want do not wait."
        products={newArrivals}
        href="/collections/new-arrivals"
        hrefLabel="All new arrivals"
      />

      <PromoSplit
        primary={{
          eyebrow: "Limited lot",
          title: settings.offerTitle,
          text: settings.offerText,
          image: settings.offerImage || "/images/banner-sale.jpg",
          href: "/collections/sale",
          cta: "Shop the sale",
        }}
        secondary={{
          eyebrow: "Made in-house",
          title: "Alterations, hemming and a proper fit",
          text: "Buy a suit or a kurta online and we will call you for measurements before it ships. First alteration is on us.",
          image: "/images/banner-tailoring.jpg",
          href: "/about",
          cta: "How it works",
          tone: "dark",
        }}
      />

      {trending.length > 0 ? (
        <section aria-labelledby="trending-heading" className="border-y border-line bg-paper py-14 md:py-20">
          <div className="shop-shell">
            <SectionHeading
              eyebrow="This month"
              title="Trending at the counter"
              description="Ranked by what actually left the shop in the last thirty days — not by what we would like to sell."
              href="/collections/best-sellers"
              hrefLabel="All best sellers"
              className="mb-9"
            />
            <TrendingRail products={trending} />
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <CollectionStrip
          eyebrow="Picked by the shop"
          title="Featured pieces"
          description="Four things we would put in front of a friend walking in today."
          products={featured}
          href="/shop?sort=popular"
          hrefLabel="More from the rail"
        />
      ) : null}

      <BrandStory
        title={settings.aboutTitle}
        story={settings.brandStory}
        points={BRAND_POINTS}
        image="/images/hero-ethnic.jpg"
        foundedYear={settings.foundedYear}
        city={settings.city}
      />

      <Suspense fallback={null}>
        <Testimonials reviews={REVIEWS.slice(0, 3)} average={averageRating(REVIEWS)} count={214} />
      </Suspense>
    </>
  );
}
