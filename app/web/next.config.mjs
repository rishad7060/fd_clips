/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Allow remote poster/thumbnail images in real mode without per-host config.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Serve modern formats (smaller payloads -> faster LCP) with automatic
    // fallback to the original format for browsers that don't support them.
    formats: ["image/avif", "image/webp"],
    // NOTE: SVG brand assets (Logo, AdminSidebar, admin sign-in, footer
    // wordmark) render with `unoptimized` so they bypass the /_next/image
    // optimizer entirely - a vector logo gains nothing from optimization and
    // the optimizer's sandbox CSP was breaking SVG rendering (broken-image
    // icon) on the standalone Docker server. Because nothing routes SVG through
    // the optimizer anymore, dangerouslyAllowSVG + its CSP are not needed.
  },
  // Long-term immutable caching for static assets served out of /public.
  // /_next/static (JS/CSS chunks) is already immutable-cached by Next itself;
  // this covers images/fonts/etc. that ship from the public/ directory, which
  // are content-addressed enough in practice (versioned via deploys) to be
  // safe to cache hard on the client + any CDN in front of the app.
  async headers() {
    const immutable = {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    };
    return [
      { source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)", headers: [immutable] },
      { source: "/:all*(woff|woff2|ttf|otf)", headers: [immutable] },
    ];
  },
};

export default nextConfig;
