/**
 * Server-side data access for the DB-backed blog (SSR pages in
 * `src/app/(blog)/blog/*` + `sitemap.ts`). Posts now live in the API's
 * database, managed via the admin console (`/admin/blog`) - this file is NOT
 * a hardcoded registry anymore, just typed fetch helpers with ISR caching.
 *
 * Contract (agreed with the API team):
 *   GET /blog        -> { posts: BlogPostView[] }   (published only, may omit bodyMarkdown)
 *   GET /blog/:slug   -> BlogPostView                (published only, includes bodyMarkdown; 404 if missing/unpublished)
 *
 * These run SERVER-SIDE only (Next.js Server Components / route handlers),
 * so `process.env.NEXT_PUBLIC_API_URL` is read directly here - no "use
 * client". Every fetch is guarded: if the API is unreachable (e.g. at build
 * time, or offline mock-mode dev), callers degrade gracefully instead of
 * throwing, so `npm run build` never depends on the API being up.
 */

export type BlogCategory = "Comparisons" | "Guides" | "Tools" | "Playbooks" | "Company";

/** Wire shape returned by the API (camelCase) - the agreed BlogPostView. */
export interface BlogPostView {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  /** Omitted on the listing endpoint; always present on GET /blog/:slug. */
  bodyMarkdown?: string;
  heroAlt: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
/** ISR revalidation window (seconds) for both the hub and post fetches. */
const REVALIDATE_SECONDS = 300;

/**
 * All published posts (GET /blog), newest-first. Returns [] if the API is
 * unset/unreachable so the hub and sitemap degrade gracefully instead of
 * crashing the build.
 */
export async function fetchBlogPosts(): Promise<BlogPostView[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/blog`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { posts: BlogPostView[] };
    return sortByNewest(data.posts ?? []);
  } catch {
    return [];
  }
}

/**
 * A single published post by slug (GET /blog/:slug), including bodyMarkdown.
 * Returns null on any failure or 404 - callers should render notFound().
 */
export async function fetchBlogPost(slug: string): Promise<BlogPostView | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/blog/${encodeURIComponent(slug)}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as BlogPostView;
  } catch {
    return null;
  }
}

function sortByNewest(posts: BlogPostView[]): BlogPostView[] {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Up to `limit` other posts, preferring the same category (for "Related posts"). */
export function relatedBlogPosts(
  posts: BlogPostView[],
  current: BlogPostView,
  limit = 3,
): BlogPostView[] {
  const others = posts.filter((p) => p.slug !== current.slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}
