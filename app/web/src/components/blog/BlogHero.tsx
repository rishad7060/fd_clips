"use client";

import { useState } from "react";
import type { BlogPostView } from "@/lib/blog";

// Category is admin-editable free text on the API, so key off a lookup with a
// safe default gradient for any category outside the known set (never a broken
// className).
const CATEGORY_GRADIENT: Record<string, string> = {
  Comparisons: "from-brand-400/40 to-ink-900",
  Guides: "from-cyan-400/30 to-ink-900",
  Tools: "from-emerald-400/25 to-ink-900",
  Playbooks: "from-amber-400/25 to-ink-900",
  Company: "from-fuchsia-400/25 to-ink-900",
};
const DEFAULT_GRADIENT = "from-brand-400/30 to-ink-900";

/**
 * LCP-friendly hero: tries /blog/<slug>.webp (dropped in later by content
 * writers) and degrades to a styled gradient placeholder card carrying the
 * category + title so there's never a broken image or layout shift. Fixed
 * aspect box (16:9) reserves the space either way. Client component only
 * because the "no image yet" fallback needs an onError handler.
 */
export function BlogHero({ post, priority = false }: { post: BlogPostView; priority?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${CATEGORY_GRADIENT[post.category] ?? DEFAULT_GRADIENT} shadow-rim`}
    >
      {!imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/blog/${post.slug}.webp`}
          alt={post.heroAlt}
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="relative flex h-full flex-col items-start justify-end p-6 sm:p-8">
        <span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/15 backdrop-blur">
          {post.category}
        </span>
        <h2 className="mt-3 max-w-lg text-balance text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
          {post.title}
        </h2>
      </div>
    </div>
  );
}
