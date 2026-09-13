import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-500.css";
import "@fontsource/playfair-display/latin-600.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-400-italic.css";
import "./globals.css";
import { Providers } from "@/app/providers";
import { env } from "@/server/env";

/**
 * Root layout: document shell, fonts and metadata only.
 * The storefront chrome (header/footer/cart) lives in (store)/layout.tsx so the
 * admin dashboard can use a completely different shell.
 */

const siteName = "Mens Wear";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${siteName} — Men's Clothing, Shirts, Jeans & Ethnic Wear`,
    template: `%s · ${siteName}`,
  },
  description:
    "Premium men's clothing: shirts, t-shirts, jeans, trousers, blazers, winterwear and ethnic wear. Cash on delivery, easy size exchange, shipped from Surat since 2014.",
  keywords: [
    "mens clothing store",
    "men's shirts online",
    "jeans for men",
    "blazers for men",
    "kurta for men",
    "formal shirts men",
    "hoodies men",
    "mens wear near me",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: env.siteUrl,
    siteName,
    title: `${siteName} — Considered menswear`,
    description:
      "Hand-finished suiting, honest cotton and everyday denim. Browse the collection, order with cash on delivery, exchange sizes free.",
    images: [{ url: "/images/hero-editorial.jpg", width: 1672, height: 941, alt: `${siteName} autumn campaign` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Considered menswear`,
    description: "Shirts, jeans, blazers, ethnic wear and winter layers. Cash on delivery across India.",
    images: ["/images/hero-editorial.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/" },
  category: "shopping",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#1c1a17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-bone"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
