import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBlogPost, fetchBlogPosts, relatedBlogPosts } from "@/lib/blog";
import { renderMarkdown, readingMinutes } from "@/lib/markdown";
import { BlogSchema, Breadcrumbs } from "@/components/blog/BlogSchema";
import { BlogHero } from "@/components/blog/BlogHero";

/** ISR: re-fetch a post from the API at most every 5 minutes. */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await fetchBlogPost(params.slug);
  if (!post) return { title: "Blog" };
  const image = `/og/blog-${post.slug}.png`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | ClipsHQ`,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      images: [image],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ClipsHQ`,
      description: post.description,
      images: [image],
    },
  };
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await fetchBlogPost(params.slug);
  if (!post) notFound();

  const allPosts = await fetchBlogPosts();
  const related = relatedBlogPosts(allPosts, post, 3);
  const minutes = readingMinutes(post.bodyMarkdown ?? "");
  const bodyHtml = renderMarkdown(post.bodyMarkdown ?? "");

  return (
    <article>
      <BlogSchema post={post} />
      <Breadcrumbs title={post.title} />

      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{post.category}</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-300">{post.description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-400">
          <span className="font-medium text-ink-200">{post.author}</span>
          <span aria-hidden>&middot;</span>
          <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
          <span aria-hidden>&middot;</span>
          <span>{minutes} min read</span>
        </div>
      </header>

      <div className="mt-10">
        <BlogHero post={post} priority />
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        {bodyHtml ? (
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <div className="blog-prose">
            <p>Content coming soon.</p>
          </div>
        )}
      </div>

      {post.tags.length > 0 && (
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-ink-850 px-2.5 py-1 text-[11px] text-ink-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Related posts</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
              >
                <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                <p className="mt-1.5 text-sm text-ink-300">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Turn a video into clips
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
    </article>
  );
}
