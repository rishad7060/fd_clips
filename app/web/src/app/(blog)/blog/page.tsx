import type { Metadata } from "next";
import Link from "next/link";
import { sortedBlogPosts } from "@/lib/blog";

const TITLE = "Blog";
const DESCRIPTION =
  "Guides, comparisons, and playbooks on turning long videos into viral short-form clips - from the team behind ClipsHQ.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
  },
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogHubPage() {
  const posts = sortedBlogPosts();
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ClipsHQ Blog",
    url: `${SITE}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt || p.publishedAt,
    })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="transition hover:text-white">Home</Link></li>
          <li aria-hidden className="text-ink-600">/</li>
          <li className="text-ink-200">Blog</li>
        </ol>
      </nav>

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Blog</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Guides, comparisons &amp; playbooks
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-300 sm:text-lg">
          Practical writing on turning long video into viral short-form clips -
          from the team behind ClipsHQ.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800 hover:shadow-lift"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <span className="rounded-full bg-brand/15 px-2 py-0.5 font-medium text-brand-300">
                {post.category}
              </span>
              <span aria-hidden>&middot;</span>
              <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
              <span aria-hidden>&middot;</span>
              <span>{post.readingMinutes} min read</span>
            </div>
            <h2 className="flex items-center gap-1.5 text-lg font-semibold text-white">
              {post.title}
              <span className="text-brand-300 transition group-hover:translate-x-0.5">→</span>
            </h2>
            <p className="text-sm text-ink-300">{post.excerpt}</p>
          </Link>
        ))}
      </section>

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Skip the reading - just try it
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Paste a link and ClipsHQ emails you the 10 best moments as ranked, captioned,
          vertical shorts - in about 30 minutes. Free to start.
        </p>
        <Link
          href="/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          Try ClipsHQ free
        </Link>
      </section>
    </div>
  );
}
