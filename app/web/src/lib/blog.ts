/**
 * Single source of truth for the ClipsHQ blog (organic-SEO + brand content
 * surface). Consumed by the /blog hub, each post's Metadata/JSON-LD/related
 * posts, and the sitemap, so a new post is registered in exactly one place -
 * mirrors the pattern in lib/compare.ts and lib/tools.ts.
 *
 * A post's BODY is intentionally NOT stored here. Each post's rich content
 * lives in its own file at `src/content/blog/<slug>.tsx`, exporting a default
 * React component. This file only holds the metadata needed to list, link to,
 * and generate SEO/schema for a post - see src/content/blog/README.md (or the
 * comment atop any content file) for the "drop in real content" convention.
 */
export type BlogCategory =
  | "Comparisons"
  | "Guides"
  | "Tools"
  | "Playbooks"
  | "Company";

export interface BlogPost {
  slug: string;
  /** <title> / H1 / card title. */
  title: string;
  /** Meta description + hub-card lead (~150-160 chars, one line). */
  description: string;
  /** Slightly punchier teaser shown on cards - can differ from `description`. */
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  /** ISO 8601 date string (YYYY-MM-DD). */
  publishedAt: string;
  /** ISO 8601 date string (YYYY-MM-DD). Defaults to publishedAt if omitted. */
  updatedAt?: string;
  /** Estimated reading time, minutes. */
  readingMinutes: number;
  /** Alt text for the hero image/placeholder. */
  heroAlt: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "clipshq-vs-opus-clip-2026",
    title: "ClipsHQ vs Opus.pro: Which AI Shorts Tool Wins in 2026?",
    description:
      "A detailed 2026 comparison of ClipsHQ and Opus.pro - pricing, watermarks, captions, and workflow - to help you pick the right AI shorts tool.",
    excerpt:
      "We put ClipsHQ head-to-head with Opus.pro on price, captions, and workflow. Here's the honest breakdown.",
    category: "Comparisons",
    tags: ["opus clip alternative", "clipshq vs opus", "ai shorts tools"],
    author: "ClipsHQ Team",
    publishedAt: "2026-01-12",
    readingMinutes: 8,
    heroAlt: "Split-screen comparison of ClipsHQ and Opus.pro clip editors",
  },
  {
    slug: "best-ai-shorts-tools-2026-2027",
    title: "The Best AI Tools to Create Shorts in 2026 & 2027",
    description:
      "The best AI tools for turning long videos into short-form clips in 2026 and 2027, ranked by value, caption quality, and workflow.",
    excerpt:
      "A ranked roundup of the AI shorts tools actually worth your time and money going into 2027.",
    category: "Comparisons",
    tags: ["ai shorts tools", "best ai clip generator", "short form video"],
    author: "ClipsHQ Team",
    publishedAt: "2026-02-03",
    readingMinutes: 10,
    heroAlt: "Grid of vertical short-form video thumbnails on a dark background",
  },
  {
    slug: "free-youtube-transcript-guide",
    title: "How to Get a Free YouTube Transcript (No Login, No API Key)",
    description:
      "Step-by-step guide to grabbing a full, accurate YouTube transcript for free - no sign-up, no API key, no browser extension required.",
    excerpt:
      "Every free way to pull a YouTube transcript in seconds, plus when you actually need one.",
    category: "Guides",
    tags: ["youtube transcript", "free tools", "how-to"],
    author: "ClipsHQ Team",
    publishedAt: "2026-02-18",
    readingMinutes: 6,
    heroAlt: "A YouTube video player next to a scrolling text transcript panel",
  },
  {
    slug: "repurpose-long-videos-into-shorts",
    title: "How to Repurpose Long Videos into Viral Shorts (2026 Playbook)",
    description:
      "The full 2026 playbook for repurposing podcasts, interviews, and long-form video into ranked, captioned short clips that actually get views.",
    excerpt:
      "A practical, repeatable playbook for turning one long video into a week of short-form content.",
    category: "Playbooks",
    tags: ["repurpose video", "short form strategy", "content playbook"],
    author: "ClipsHQ Team",
    publishedAt: "2026-03-05",
    readingMinutes: 9,
    heroAlt: "A long video timeline being cut into several short vertical clips",
  },
  {
    slug: "why-clipshq-better-value",
    title: "Why ClipsHQ Is the Best-Value AI Clip Generator",
    description:
      "Why ClipsHQ's minute-based pricing, no-watermark clips, and multilingual captions make it the best-value AI clip generator on the market.",
    excerpt:
      "No credit math, no watermark, no lock-in - here's the case for ClipsHQ as the value pick.",
    category: "Company",
    tags: ["clipshq", "pricing", "value"],
    author: "ClipsHQ Team",
    publishedAt: "2026-03-22",
    readingMinutes: 5,
    heroAlt: "ClipsHQ pricing plans displayed on a dark dashboard",
  },
];

export function blogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Newest-first, driven off publishedAt - the single sort order used by the hub. */
export function sortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Up to `limit` other posts, preferring the same category (for "Related posts"). */
export function relatedBlogPosts(slug: string, limit = 3): BlogPost[] {
  const current = blogPostBySlug(slug);
  const others = BLOG_POSTS.filter((p) => p.slug !== slug);
  if (!current) return others.slice(0, limit);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}
