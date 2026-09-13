import type { ProductDetail } from "@/server/repositories/types";
import type { Settings } from "@/server/repositories/settings.repository";

/** Absolute URLs for Open Graph + JSON-LD. Falls back to localhost in the sandbox. */
export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const STATUS_SCHEMA: Record<string, string> = {
  InStock: "https://schema.org/InStock",
  OutOfStock: "https://schema.org/OutOfStock",
  BackOrder: "https://schema.org/BackOrder",
  SoldOut: "https://schema.org/SoldOut",
};

/**
 * Product structured data for search engines and share cards. Prices and stock
 * come from the same repository the page renders from, so the markup can never
 * drift from what a shopper sees.
 */
export function productJsonLd(product: ProductDetail, settings: Settings) {
  const availability = product.inStock ? "InStock" : product.stock > 0 ? "BackOrder" : "SoldOut";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    description: product.description ?? `${product.name} from ${product.brand ?? settings.shopName}.`,
    image: product.gallery.map((image) => absoluteUrl(image.src)),
    url: absoluteUrl(`/product/${product.slug}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: "INR",
      price: product.price.toFixed(2),
      availability: STATUS_SCHEMA[availability],
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "ShippingRateSettings", shippingRateCurrency: "INR", shippingRateValue: settings.deliveryFee },
        shippingDestination: { "@type": "AdminArea", name: "IN" },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnFees: "https://schema.org/FreeReturn",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        returnPolicyReason: "https://schema.org/SizeMismatch",
        merchantReturnDays: settings.returnWindowDays,
      },
    },
    ...(product.rating && product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** Store-level markup: a local shop with a phone number, hours and a PIN area. */
export function storeJsonLd(settings: Settings) {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: settings.shopName,
    description: settings.tagline,
    url: absoluteUrl("/"),
    telephone: settings.phone,
    email: settings.email,
    foundingDate: settings.foundedYear,
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", "),
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.pin,
      addressCountry: "IN",
    },
    openingHours: settings.hours,
    sameAs: [settings.instagram, settings.facebook, settings.youtube].filter(Boolean),
    potentialAction: {
      "@type": "OrderAction",
      target: absoluteUrl("/shop"),
    },
  };
}

export function policyJsonLd(title: string, description: string, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(`/policies/${slug}`),
  };
}
