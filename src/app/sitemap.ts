import type { MetadataRoute } from "next";
import { all } from "@/server/db";
import { policySlugs } from "@/lib/policies";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Sitemap built from the live catalogue, so a hidden product drops out of it the
 * moment it is unpublished. Admin, account, cart and checkout are deliberately
 * absent — they are either private or useless to a crawler.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const products = all<{ slug: string; updatedAt: string }>(
    `SELECT slug, updated_at AS updatedAt FROM products WHERE status = 'published' ORDER BY updated_at DESC`,
  );
  const categories = all<{ slug: string }>(`SELECT slug FROM categories WHERE parent_id IS NULL ORDER BY sort, name`);

  const statics: [string, number, "daily" | "weekly" | "monthly"][] = [
    ["", 1, "daily"],
    ["/shop", 0.9, "daily"],
    ["/offers", 0.8, "weekly"],
    ["/collections/new-arrivals", 0.8, "daily"],
    ["/collections/best-sellers", 0.7, "daily"],
    ["/collections/featured", 0.7, "weekly"],
    ["/collections/sale", 0.7, "weekly"],
    ["/about", 0.5, "monthly"],
    ["/contact", 0.5, "monthly"],
    ["/security", 0.4, "monthly"],
    ["/track", 0.4, "monthly"],
  ];

  return [
    ...statics.map(([path, priority, changeFrequency]) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/shop?category=${encodeURIComponent(category.slug)}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      // The row's own timestamp: a product untouched for a year should not
      // pretend it changed today.
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...policySlugs().map((slug) => ({
      url: absoluteUrl(`/policies/${slug}`),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
