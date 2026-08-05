import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { CompareTable, Faq, CompareCta, type CompareRow } from "@/components/compare/CompareTable";

const SLUG = "clipshq-vs-klap";
const COMPETITOR = "Klap";
const TITLE = "ClipsHQ vs Klap - Which AI Clip Tool Is Better?";
const DESCRIPTION =
  "ClipsHQ vs Klap compared: pricing, captions, watermarks and workflow. See why ClipsHQ is a simpler, multilingual-friendly Klap alternative for turning long videos into shorts.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "clipshq vs klap",
    "klap alternative",
    "klap vs clipshq",
    "klap competitor",
    "klap app alternative",
    "ai clip generator comparison",
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

const ROWS: CompareRow[] = [
  { label: "Starting price", clipshq: "Low, entry-friendly plans", competitor: "Subscription tiers" },
  { label: "Free tier", clipshq: "Yes - start free, no card", competitor: "Free trial / limited free use" },
  { label: "Pricing model", clipshq: "Simple minute-based (pay for video minutes)", competitor: "Plan / credit based" },
  { label: "Watermark on free clips", clipshq: false, competitor: "Watermark on free/lower tiers" },
  { label: "Email delivery workflow", clipshq: "Yes - clips emailed when ready, hands-off", competitor: "Dashboard-first" },
  { label: "Free creator tools", clipshq: "Yes - transcript, subtitles, hashtags, tags", competitor: "Limited free tools" },
  { label: "Multilingual / RTL captions", clipshq: "Strong - Arabic, Urdu, Hindi, Tamil (RTL-aware)", competitor: "Broad language support" },
  { label: "Aspect ratios", clipshq: "9:16, 1:1, 4:5, 16:9", competitor: "9:16, 1:1, 16:9" },
  { label: "Editor", clipshq: "Instant inline editor (position, color, text, trim)", competitor: "Built-in editor" },
];

const FAQS = [
  {
    q: "Is ClipsHQ a good Klap alternative?",
    a: "Yes. ClipsHQ does the same core job - it turns a long video into ranked, captioned vertical shorts - with simple minute-based pricing, no watermark on your clips, and a hands-off flow where finished clips are emailed to you. It is a strong pick if you want that outcome with predictable costs.",
  },
  {
    q: "How is ClipsHQ pricing different from Klap?",
    a: "ClipsHQ charges by video minutes processed, so you know a job's cost before you run it, and it starts at a low entry price. Always check Klap's current pricing page for its latest plans, since tools change their pricing over time.",
  },
  {
    q: "Which is better for non-English captions?",
    a: "ClipsHQ was built with strong right-to-left and South-Asian caption support (Arabic, Urdu, Hindi, Tamil), so word-by-word captions render correctly in those scripts. If you create in those languages, that is a meaningful edge.",
  },
  {
    q: "Does ClipsHQ put a watermark on my clips?",
    a: "No watermark is baked into your finished clips on paid plans, so you can post them anywhere without a logo.",
  },
];

export default function Page() {
  return (
    <div>
      <CompareSchema slug={SLUG} name={`ClipsHQ vs ${COMPETITOR}`} faqs={FAQS} />
      <Breadcrumbs name={`ClipsHQ vs ${COMPETITOR}`} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Comparison</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          ClipsHQ vs Klap
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Both turn long videos into captioned vertical shorts. The differences come down to
          how you pay, whether your clips carry a watermark, how they reach you, and how well
          the captions handle languages beyond English.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          If you&apos;re weighing a <strong className="text-white">Klap alternative</strong>,
          the honest starting point is that both tools produce the same kind of output. What
          separates them is the workflow around that output - pricing you can predict, clean
          clips without a watermark, and captions that render correctly in Arabic, Urdu,
          Tamil and Hindi. Here&apos;s the side-by-side.
        </p>
      </section>

      <section className="mt-10">
        <CompareTable competitorName={COMPETITOR} rows={ROWS} />
        <p className="mt-3 text-center text-xs text-ink-500">
          Competitor details are kept high-level and may change - always check{" "}
          {COMPETITOR}&apos;s current pricing page. ClipsHQ figures reflect our own plans.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-2xl text-ink-300">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
          Who should choose ClipsHQ
        </h2>
        <p className="mt-4 text-base leading-7">
          Choose <strong className="text-white">ClipsHQ</strong> if you want predictable
          minute-based pricing instead of plan or credit math, clips without a watermark, and
          a hands-off flow where finished shorts land in your inbox. It&apos;s especially
          strong for creators working in Arabic, Urdu, Hindi or Tamil, and for anyone who
          also wants a suite of free tools alongside the clip maker.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta />
    </div>
  );
}
