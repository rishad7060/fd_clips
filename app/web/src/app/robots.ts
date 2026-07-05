import type { MetadataRoute } from "next";

/**
 * robots.txt - allow crawling of public/marketing pages, disallow the authed app
 * surfaces and API routes, and point crawlers at the sitemap.
 */
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/dashboard", "/new", "/billing", "/clips"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
