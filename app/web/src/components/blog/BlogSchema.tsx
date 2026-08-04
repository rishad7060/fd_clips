import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

/**
 * Shared structured data + shared UI bits for a blog post page:
 *  - BlogSchema: BreadcrumbList (Home › Blog › <post>) + BlogPosting JSON-LD.
 *  - Breadcrumbs: the visible trail matching the BreadcrumbList schema.
 *
 * Emits absolute URLs via NEXT_PUBLIC_SITE_URL so the schema is valid in prod.
 * Mirrors components/compare/CompareSchema.tsx.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function BlogSchema({ post }: { post: BlogPost }) {
  const url = `${SITE}/blog/${post.slug}`;
  const image = `${SITE}/og/blog-${post.slug}.png`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    image,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "ClipsHQ",
      logo: { "@type": "ImageObject", url: `${SITE}/emblem.png` },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
    </>
  );
}

/** A visible breadcrumb trail (matches the BreadcrumbList schema above). */
export function Breadcrumbs({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/" className="transition hover:text-white">Home</Link></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li><Link href="/blog" className="transition hover:text-white">Blog</Link></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li className="max-w-[60vw] truncate text-ink-200 sm:max-w-xs">{title}</li>
      </ol>
    </nav>
  );
}
