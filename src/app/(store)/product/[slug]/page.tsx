import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductGrid } from "@/components/shop/product-grid";
import { SectionHeading } from "@/components/home/section-heading";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { getSettings, getProductWithRelated } from "@/server/queries";
import { absoluteUrl, productJsonLd } from "@/lib/seo";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = getProductWithRelated(slug);
  if (!found) return { title: "Product not found" };
  const { product } = found;
  const description = (product.description ?? `${product.name} from ${product.brand ?? "Aakash Men's Wear"}.`).slice(0, 158);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} · Aakash Men's Wear`,
      description,
      url: absoluteUrl(`/product/${product.slug}`),
      type: "website",
      images: product.gallery.slice(0, 2).map((image) => ({ url: absoluteUrl(image.src), alt: image.alt || product.name })),
    },
    twitter: { card: "summary_large_image", title: product.name, description },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const found = getProductWithRelated(slug);
  if (!found) notFound();

  const { product, related } = found;
  const settings = getSettings();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, settings)) }}
      />

      <div className="shop-shell pt-5">
        <Breadcrumb
          items={[
            { name: "Home", href: "/" },
            ...(product.category ? [{ name: product.category.name, href: `/collections/${product.category.slug}` }] : []),
            { name: product.name },
          ]}
        />
      </div>

      <div className="shop-shell pb-14 pt-5 md:pb-20 md:pt-8">
        <ProductDetail
          product={product}
          settings={settings}
          related={
            related.length > 0 ? (
              <section aria-labelledby="related-heading" className="mt-14 border-t border-line pt-10 md:mt-20">
                <SectionHeading
                  eyebrow="Goes with it"
                  title="Related pieces"
                  description="Men who took this usually left with one of these — same cloth families, same fitting."
                  href={product.category ? `/collections/${product.category.slug}` : "/shop"}
                  hrefLabel={`All ${product.category?.name.toLowerCase() ?? "products"}`}
                  className="mb-8"
                />
                <ProductGrid products={related} columns={4} />
              </section>
            ) : null
          }
        />
      </div>

      <nav aria-label="Product" className="sr-only">
        <Link href="/shop">Back to the shop rail</Link>
      </nav>
    </>
  );
}
