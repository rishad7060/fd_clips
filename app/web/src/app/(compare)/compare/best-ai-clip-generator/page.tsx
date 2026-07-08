import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { Faq, CompareCta } from "@/components/compare/CompareTable";

const SLUG = "best-ai-clip-generator";
const TITLE = "Best AI Clip Generator (2026) - Ranked for Value";
const DESCRIPTION =
  "The best AI clip generators of 2026, ranked. We put ClipsHQ #1 for value - simple minute pricing, no watermark, multilingual captions - then compare the main alternatives fairly.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best ai clip generator",
    "best ai clip generator 2026",
    "best ai shorts generator",
    "best clip maker",
    "ai clip generator comparison",
    "opus clip alternative",
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
    name: "ClipsHQ - best for value",
    tag: "Editor's pick",
    winner: true,
    body:
      "Turns any long video into ranked, captioned vertical shorts and emails them to you hands-off. Simple minute-based pricing (no confusing credits), no watermark on your clips, strong Arabic/Urdu/Hindi/Tamil caption support, and a suite of free creator tools. The best mix of price and simplicity in 2026.",
  },
  {
    rank: "2",
    name: "Established all-rounders",
    tag: "Popular, mature",
    body:
      "Well-known tools like Opus Clip are polished and feature-rich, with mature timeline editors. Expect credit-based pricing and higher costs - a fine pick if you want a big-brand tool and don't mind paying for it.",
  },
  {
    rank: "3",
    name: "Minute-based clip tools",
    tag: "Predictable billing",
    body:
      "Tools like Vizard bill around processed minutes and cover the core auto-clipping job well. Watch for watermarks on free tiers and tiered plans that add up as you scale.",
  },
  {
    rank: "4",
    name: "Caption-first tools",
    tag: "Great captions",
    body:
      "Tools like Submagic focus on punchy, animated captions and are excellent if captioning is your main need - though they do less of the full 'find the best moments' auto-clipping.",
  },
];

const FAQS = [
  {
    q: "What is the best AI clip generator in 2026?",
    a: "For value and simplicity, ClipsHQ is our top pick: it auto-clips long videos into captioned vertical shorts, uses transparent minute-based pricing with no watermark, supports right-to-left and South-Asian captions, and emails you the finished clips. Established tools like Opus Clip are strong but pricier and use credits.",
  },
  {
    q: "How did you rank these tools?",
    a: "We weighted total cost and pricing clarity, whether the free tier watermarks clips, caption quality across languages, delivery workflow, and how much manual editing is required. ClipsHQ leads on value; other tools lead in specific niches like mature editors or caption styles.",
  },
  {
    q: "Is there a free AI clip generator?",
    a: "Yes - ClipsHQ has a free tier with no credit card required and no watermark on your clips. Several competitors offer free trials, but many watermark output on their lowest tiers.",
  },
  {
    q: "Which AI clip tool is best for non-English content?",
    a: "ClipsHQ, thanks to strong right-to-left and South-Asian caption support (Arabic, Urdu, Hindi, Tamil) with word-by-word karaoke captions that render correctly in those scripts.",
  },
];

export default function Page() {
  return (
    <div>
      <CompareSchema slug={SLUG} name="Best AI Clip Generator (2026)" faqs={FAQS} />
      <Breadcrumbs name="Best AI Clip Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">2026 ranking</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Best AI clip generator (2026)
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          The best AI clip generators this year, ranked for value. ClipsHQ leads on
          price and simplicity - here&apos;s how it stacks up against the main
          categories of alternatives.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Every tool below finds the best moments in a long video and turns them into
          captioned vertical shorts. They differ on <strong className="text-white">price,
          pricing model, watermarks, caption languages and workflow</strong>. We ranked
          for overall value - the best result for the least cost and hassle.
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
          Why ClipsHQ takes the top spot
        </h2>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">ClipsHQ</strong> wins on value: you pay by video
          minutes (no credit math), your clips never carry a watermark, and finished
          shorts are emailed to you so you can stay hands-off. Add strong multilingual and
          right-to-left caption support plus free transcript, subtitle, hashtag and tag
          tools, and it&apos;s the most complete package for the price. If you want a
          mature timeline editor above all else, an established tool may suit you - but
          you&apos;ll usually pay more for it.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta heading="Try the #1 value pick free" />
    </div>
  );
}
