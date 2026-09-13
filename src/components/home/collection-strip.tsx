import { ProductGrid } from "@/components/shop/product-grid";
import { SectionHeading } from "@/components/home/section-heading";
import type { ProductCard } from "@/server/repositories/types";

export function CollectionStrip({
  eyebrow,
  title,
  description,
  products,
  href,
  hrefLabel,
  columns = 4,
  background = "bone",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  products: ProductCard[];
  href?: string;
  hrefLabel?: string;
  columns?: 3 | 4 | 5;
  background?: "bone" | "paper";
}) {
  if (products.length === 0) return null;
  return (
    <section className={background === "paper" ? "border-y border-line bg-paper" : ""}>
      <div className="shop-shell py-14 md:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} href={href} hrefLabel={hrefLabel} className="mb-8" />
        <ProductGrid products={products} columns={columns} />
      </div>
    </section>
  );
}
