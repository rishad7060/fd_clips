import Link from "next/link";
import type { Metadata } from "next";
import { Card, SectionTitle } from "@/components/ui/Card";
import { HELP_ARTICLES, HELP_CATEGORIES, OPUS_DOCS, articlesByCategory } from "@/lib/help";

export const metadata: Metadata = {
  title: "Help center - Clips",
  description: "Guides for making clips, captions, credits, billing, sources, and languages.",
};

/**
 * Help center index. A clean, on-brand directory: a hero, a category strip, and
 * an article grid grouped by category. Articles render from the typed HELP_ARTICLES
 * data (lib/help.tsx) via the [slug] template - no MDX tooling.
 */
export default function HelpIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      {/* Hero */}
      <div className="mb-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-400 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Home
        </Link>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Help center</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink-300">
        Everything you need to turn long videos into ranked, captioned vertical clips - getting started,
        captions, credits and billing, supported sources, and languages.
      </p>

      {/* Category strip */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_CATEGORIES.map((c) => (
          <Card key={c.name} className="flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-300 ring-1 ring-brand/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={c.icon} />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">{c.name}</h3>
              <p className="mt-0.5 text-xs leading-5 text-ink-400">{c.blurb}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Articles, grouped by category */}
      {HELP_CATEGORIES.map((c) => {
        const items = articlesByCategory(c.name);
        if (items.length === 0) return null;
        return (
          <section key={c.name} className="mt-10">
            <SectionTitle>{c.name}</SectionTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <Link key={a.slug} href={`/help/${a.slug}`} className="group">
                  <Card interactive className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-semibold leading-6 tracking-tight text-white transition group-hover:text-brand-200">
                        {a.title}
                      </h3>
                      <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                    <p className="mt-1.5 flex-1 text-sm leading-6 text-ink-400">{a.summary}</p>
                    <span className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-500">{a.readMins} min read</span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <p className="mt-12 text-xs text-ink-500">
        {HELP_ARTICLES.length} articles · Looking for the original reference?{" "}
        <a href={OPUS_DOCS} target="_blank" rel="noopener noreferrer" className="text-ink-400 underline-offset-4 transition hover:text-ink-200 hover:underline">
          Opus docs
        </a>
        .
      </p>
    </div>
  );
}
