import type { Metadata } from "next";
import Link from "next/link";
import { Captions, Download, Hash, Tags } from "lucide-react";
import { TOOLS } from "@/lib/tools";

const TITLE = "Free YouTube Tools for Creators";
const DESCRIPTION =
  "Free, no-sign-up YouTube tools: transcript generator, subtitle downloader, hashtag generator, and tags extractor. No API key, no watermark - built by Clips.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "free youtube tools",
    "youtube creator tools",
    "youtube transcript",
    "youtube subtitle downloader",
    "youtube hashtag generator",
    "youtube tags extractor",
  ],
  alternates: { canonical: "/tools" },
  openGraph: {
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools",
    images: ["/og/tools.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    images: ["/og/tools.png"],
  },
};

const ICONS = { captions: Captions, download: Download, hash: Hash, tags: Tags } as const;

/** ItemList schema so the hub can surface as a rich list + feed the tool pages. */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const itemListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free YouTube Tools",
  itemListElement: TOOLS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.title,
    url: `${SITE}/tools/${t.slug}`,
  })),
};

export default function ToolsHubPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tools</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Free YouTube tools for creators
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          A growing set of free, no-sign-up tools for creators - transcripts,
          subtitles, hashtags and tags. No API key, no watermark.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800 hover:shadow-lift"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-300">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-base font-semibold text-white">
                  {t.title}
                  <span className="text-brand-300 transition group-hover:translate-x-0.5">→</span>
                </h2>
                <p className="mt-1 text-sm text-ink-300">{t.blurb}</p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* SEO intro + why-use section (targets 'free youtube tools') */}
      <section className="mx-auto mt-16 max-w-2xl text-ink-300">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
          Free YouTube tools, no strings attached
        </h2>
        <p className="mt-4 text-base leading-7">
          Every tool here is <strong className="text-white">100% free</strong> - no account, no
          credit card, no watermark, and no API key. Paste a link (or a topic) and
          get what you need in seconds. The transcript, subtitle and tags tools
          read a video&apos;s own public data, so nothing is ever charged or
          throttled. Use them as often as you like.
        </p>
        <p className="mt-4 text-base leading-7">
          They&apos;re built by <strong className="text-white">Clips</strong>, an AI that turns any
          long video into ranked, captioned, vertical short clips. When you&apos;re
          ready to go from a transcript to finished shorts, the same link works in
          our clip maker.
        </p>
      </section>

      {/* Cross-sell to the paid product */}
      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Or turn a whole video into viral clips
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Clips reads the entire video and emails you the 10 best moments as
          ranked, captioned, vertical shorts - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
