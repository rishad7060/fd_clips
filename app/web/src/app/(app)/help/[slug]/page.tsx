import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { HELP_ARTICLES, articleBySlug } from "@/lib/help";

/** Pre-render every help article at build time. */
export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = articleBySlug(params.slug);
  if (!article) return { title: "Help center — FocalDive Clips" };
  return {
    title: `${article.title} — FocalDive Clips`,
    description: article.summary,
  };
}

/**
 * Help article template. Renders one article from the typed HELP_ARTICLES data
 * (lib/help.tsx) — the `body()` render function returns styled React, so there's
 * no markdown layer. Shows a breadcrumb, the body, and "next article" links.
 */
export default function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = articleBySlug(params.slug);
  if (!article) notFound();

  const related = HELP_ARTICLES.filter((a) => a.category === article.category && a.slug !== article.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-ink-400">
        <Link href="/help" className="inline-flex items-center gap-1 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Help
        </Link>
        <span className="text-ink-600">/</span>
        <span className="text-ink-400">{article.category}</span>
      </nav>

      <header className="mb-7">
        <span className="font-mono text-[11px] uppercase tracking-wide text-brand-300">{article.category}</span>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">{article.title}</h1>
        <p className="mt-2 text-[15px] leading-7 text-ink-400">{article.summary}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-500">{article.readMins} min read</p>
      </header>

      <article className="border-t border-white/10 pt-7">{article.body()}</article>

      {/* Related / more articles */}
      {related.length > 0 && (
        <div className="mt-12 border-t border-white/10 pt-7">
          <h2 className="mb-4 text-sm font-semibold tracking-tight text-white">More in {article.category}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((a) => (
              <Link key={a.slug} href={`/help/${a.slug}`} className="group">
                <Card interactive className="flex h-full items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-5 text-white transition group-hover:text-brand-200">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-400">{a.summary}</p>
                  </div>
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 border-t border-white/10 pt-6">
        <Link href="/help" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 transition hover:text-brand-200">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back to all articles
        </Link>
      </div>
    </div>
  );
}
