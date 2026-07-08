import type { Metadata } from "next";
import Link from "next/link";
import { COMPARE_PAGES } from "@/lib/compare";

const TITLE = "ClipsHQ Comparisons - AI Clip Generator Alternatives";
const DESCRIPTION =
  "Compare ClipsHQ to Opus Clip, Vizard and Submagic, and see the best and cheapest AI clip generators of 2026. Honest, side-by-side breakdowns of price, captions and workflow.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "opus clip alternative",
    "vizard alternative",
    "submagic alternative",
    "best ai clip generator",
    "cheapest ai clip generator",
    "ai clip generator comparison",
    "clipshq vs opus clip",
  ],
  alternates: { canonical: "/compare" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/compare",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
  },
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const itemListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ClipsHQ Comparisons",
  itemListElement: COMPARE_PAGES.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.title,
    url: `${SITE}/compare/${c.slug}`,
  })),
};

export default function CompareHubPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><a href="/" className="transition hover:text-white">Home</a></li>
          <li aria-hidden className="text-ink-600">/</li>
          <li className="text-ink-200">Compare</li>
        </ol>
      </nav>

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Compare</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          ClipsHQ vs the alternatives
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Honest, side-by-side breakdowns of price, captions and workflow - so you can
          pick the right AI clip generator without the guesswork.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {COMPARE_PAGES.map((c) => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="group flex flex-col rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800 hover:shadow-lift"
          >
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-white">
              {c.title}
              <span className="text-brand-300 transition group-hover:translate-x-0.5">→</span>
            </h2>
            <p className="mt-1.5 text-sm text-ink-300">{c.blurb}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-2xl text-ink-300">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
          Choosing an AI clip generator in 2026
        </h2>
        <p className="mt-4 text-base leading-7">
          Most AI clip tools do the same core job - find the best moments in a long
          video and turn them into captioned vertical shorts. Where they differ is
          <strong className="text-white"> price, how you pay </strong>(minutes vs
          credits), whether the free tier watermarks your clips, how good the captions
          are in languages beyond English, and how much hands-on editing you have to do.
        </p>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">ClipsHQ</strong> is built to be the simple,
          affordable pick: transparent minute-based pricing, hands-off email delivery,
          a suite of genuinely free creator tools, and strong right-to-left and
          South-Asian caption support (Arabic, Urdu, Hindi, Tamil). The comparisons
          above lay it all out fairly.
        </p>
      </section>

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Skip the comparison - just try it
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Paste a link and ClipsHQ emails you the 10 best moments as ranked, captioned,
          vertical shorts - in about 30 minutes. Free to start.
        </p>
        <a
          href="/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          Try ClipsHQ free
        </a>
      </section>
    </div>
  );
}
