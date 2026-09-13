import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Robots file for the shop. The dashboard, account area and every transactional
 * step are disallowed, and the admin is additionally `noindex` in its own metadata
 * so it is excluded twice over.
 */
export default function robots(): MetadataRoute.Robots {
  const production = process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  return {
    rules: production
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api/", "/account", "/cart", "/checkout", "/order/"],
          },
        ]
      : // A preview or a sandbox build should not be indexed at all.
        [{ userAgent: "*", disallow: "/" }],
    sitemap: production ? absoluteUrl("/sitemap.xml") : undefined,
    host: production ? new URL(absoluteUrl("/")).host : undefined,
  };
}
