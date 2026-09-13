/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  // Dev-only: the sandbox serves the preview from a proxied *.e2b.app origin, and
  // Next 15.5 warns that cross-origin /_next requests will need allowlisting.
  // Harmless in production (ignored) — replace with your own host if you preview
  // from somewhere else.
  allowedDevOrigins: ["*.e2b.app"],
  poweredByHeader: false,
  // Native/optional modules used only on the server must not be bundled. The
  // database itself is node:sqlite (a Node built-in, so nothing to allowlist).
  serverExternalPackages: ["sharp"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 540, 640, 768, 828, 1080, 1200, 1600],
    imageSizes: [40, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Same-origin media route (/api/media/*) is optimized by Next automatically.
  },
  async redirects() {
    return [
      // Old and hand-typed paths the shop has used over the years, all kept alive so
      // a link printed on a board three seasons ago still lands somewhere useful.
      { source: "/categories/:slug", destination: "/shop?category=:slug", permanent: true },
      { source: "/products/:slug", destination: "/product/:slug", permanent: true },
      { source: "/collection/:slug", destination: "/collections/:slug", permanent: true },
      { source: "/new-arrivals", destination: "/collections/new-arrivals", permanent: true },
      { source: "/best-sellers", destination: "/collections/best-sellers", permanent: true },
      { source: "/policy/:slug", destination: "/policies/:slug", permanent: true },
      { source: "/my-account", destination: "/account", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/fonts/:all*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:all*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=31536000" },
        ],
      },
      {
        source: "/:all*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // The owner area gets the strict version: it must never be framed (a
        // clickjacking page that turns “Mark paid” into something else), it must not
        // be cached by a shared browser in the shop, and it needs no camera, mic,
        // geolocation or payment API at all.
        //
        // In development only, the preview host is allowed to frame it — that is how
        // this sandbox shows you the dashboard. Nothing else changes between the two.
        source: "/admin/:all*",
        headers: [
          {
            key: "X-Frame-Options",
            value: isProduction ? "DENY" : "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${isProduction ? "'none'" : "'self' https://*.e2b.app"}; base-uri 'self'; form-action 'self'`,
          },
          { key: "Cache-Control", value: "no-store" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
