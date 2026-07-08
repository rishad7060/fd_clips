import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { Faq, CompareCta } from "@/components/compare/CompareTable";

const SLUG = "cheapest-ai-clip-generator";
const TITLE = "Cheapest AI Clip Generator (2026) - Most Affordable Picks";
const DESCRIPTION =
  "The cheapest AI clip generators of 2026. ClipsHQ leads on price with simple minute-based billing, a free tier and no watermark - plus how to get AI shorts for the least money.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "cheapest ai clip generator",
    "cheap ai clip generator",
    "affordable ai clip generator",
    "cheapest ai shorts maker",
    "free ai clip generator",
    "opus clip alternative cheap",
  ],
  alternates: { canonical: `/compare/${SLUG}` },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: `/compare/${SLUG}`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
  },
};

const PICKS: { rank: string; name: string; tag: string; body: string; winner?: boolean }[] = [
  {
    rank: "1",
    name: "ClipsHQ - cheapest for real work",
    tag: "Best value",
    winner: true,
    body:
      "A genuinely free tier with no credit card and no watermark, then low, transparent minute-based pricing when you scale. Because you pay per video minute - not per credit - it's easy to see exactly what a job costs, and there are no surprise overage fees. The most affordable way to ship polished, captioned shorts.",
  },
  {
    rank: "2",
    name: "Free tiers with watermarks",
    tag: "Free but limited",
    body:
      "Many tools offer a $0 tier, but stamp a watermark on your clips or cap you tightly. Fine for testing, but you'll pay - or upgrade - the moment you want to actually post the output.",
  },
  {
    rank: "3",
    name: "Credit-based tools",
    tag: "Watch the math",
    body:
      "Tools like Opus Clip price in credits. Headline prices can look low, but credits get consumed faster than expected, so the effective cost per finished clip can be higher than it appears.",
  },
  {
    rank: "4",
    name: "Free open-source / DIY",
    tag: "$0 but hands-on",
    body:
      "You can self-host open-source pipelines for near-zero cost, but you trade money for time: setup, a capable machine, and manual tuning. Great for tinkerers, slow for creators who just want clips.",
  },
];

const FAQS = [
  {
    q: "What is the cheapest AI clip generator?",
    a: "ClipsHQ is our pick for the cheapest way to do real work: it has a free tier with no watermark and no credit card, then low minute-based pricing. Because you pay per video minute rather than per credit, the cost is predictable and there are no surprise fees.",
  },
  {
    q: "Is there a completely free AI clip generator?",
    a: "Yes - ClipsHQ has a free tier you can start with no card, and it doesn't watermark your clips. Many competitors also offer free tiers, but often add a watermark or a tight monthly cap.",
  },
  {
    q: "Why is minute-based pricing cheaper than credits?",
    a: "With minute-based pricing you pay for the length of video you process, so the cost maps directly to what you use. Credit systems can burn faster than expected on longer videos or re-runs, which makes the true cost per clip harder to predict and often higher.",
  },
  {
    q: "Do cheap AI clip tools add a watermark?",
    a: "Many do on their free or lowest tiers. ClipsHQ does not watermark your clips, so 'cheap' doesn't mean a logo baked into everything you post.",
  },
];

export default function Page() {
  return (
    <div>
      <CompareSchema slug={SLUG} name="Cheapest AI Clip Generator (2026)" faqs={FAQS} />
      <Breadcrumbs name="Cheapest AI Clip Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">2026 ranking</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Cheapest AI clip generator (2026)
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Where to get AI shorts for the least money - without watermarks or confusing
          credit math. ClipsHQ leads on price; here are the honest runners-up.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          &quot;Cheapest&quot; only matters if the output is usable. A $0 tool that
          <strong className="text-white"> watermarks every clip</strong> or a credit plan
          that <strong className="text-white">burns faster than expected</strong> isn&apos;t
          really cheap. We ranked by real cost to ship a finished, postable short.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        {PICKS.map((p) => (
          <div
            key={p.rank}
            className={`flex gap-5 rounded-2xl border p-6 shadow-rim ${
              p.winner
                ? "border-brand/40 bg-gradient-to-b from-brand/[0.10] to-ink-850"
                : "border-white/10 bg-ink-850"
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${
                p.winner ? "bg-brand/20 text-brand-300" : "bg-white/5 text-ink-300"
              }`}
            >
              {p.rank}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-white">{p.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.winner ? "bg-brand/20 text-brand-300" : "bg-white/5 text-ink-400"
                  }`}
                >
                  {p.tag}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-300">{p.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-2xl text-ink-300">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
          Why ClipsHQ is the cheapest for real creators
        </h2>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">ClipsHQ</strong> gives you a free, watermark-free
          starting point and then charges by the minute, so your bill maps directly to the
          video you actually process - no credits to run out of, no overage surprises. You
          also get free transcript, subtitle, hashtag and tag tools on top, which would cost
          extra elsewhere. For creators who want postable shorts at the lowest predictable
          cost, it&apos;s the value leader.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta heading="Start free - no watermark" />
    </div>
  );
}
