import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { HELP_ARTICLES } from "@/lib/help";
import { COMPARE_PAGES } from "@/lib/compare";

/**
 * Sitemap for search engines. Lists the public, indexable pages - the marketing
 * home, the free-tools hub + every tool (organic-traffic surfaces), and the
 * legal pages. The authed app (/dashboard, /new, /admin) is intentionally
 * excluded.
 *
 * Base URL comes from NEXT_PUBLIC_SITE_URL (set it to the production origin,
 * e.g. https://clips.focaldive.com); falls back to localhost for dev.
 */
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];
  const routes: { path: string; priority: number; changeFrequency: Freq }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/tools", priority: 0.9, changeFrequency: "weekly" },
    // Every free tool, driven by the shared registry so new tools appear here
    // automatically.
    ...TOOLS.map((t) => ({
      path: `/tools/${t.slug}`,
      priority: 0.9,
      changeFrequency: "weekly" as Freq,
    })),
    // Help center + every article (indexable content = more organic surface).
    // ── Comparison / alternatives pages (high-intent "vs" + "best/cheapest"
    // SEO surfaces), driven by the shared registry. ──────────────────────────
    { path: "/compare", priority: 0.7, changeFrequency: "weekly" },
    ...COMPARE_PAGES.map((c) => ({
      path: `/compare/${c.slug}`,
      priority: 0.7,
      changeFrequency: "weekly" as Freq,
    })),
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    ...HELP_ARTICLES.map((a) => ({
      path: `/help/${a.slug}`,
      priority: 0.5,
      changeFrequency: "monthly" as Freq,
    })),
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/trust", priority: 0.6, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/accessibility", priority: 0.3, changeFrequency: "yearly" },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
