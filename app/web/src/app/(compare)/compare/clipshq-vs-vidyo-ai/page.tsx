import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { CompareTable, Faq, CompareCta, type CompareRow } from "@/components/compare/CompareTable";

const SLUG = "clipshq-vs-vidyo-ai";
const COMPETITOR = "vidyo.ai";
const TITLE = "ClipsHQ vs vidyo.ai - Which AI Clip Tool Is Better?";
const DESCRIPTION =
  "ClipsHQ vs vidyo.ai compared: pricing, caption accuracy, watermarks and workflow. See why ClipsHQ is a strong, multilingual-friendly vidyo.ai alternative for creating shorts.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "clipshq vs vidyo.ai",
    "vidyo.ai alternative",
    "vidyo ai vs clipshq",
    "vidyo.ai competitor",
    "vidyo ai alternative",
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
  { label: "Free tier", clipshq: "Yes - start free, no card", competitor: "Free tier / trial available" },
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
    q: "Is ClipsHQ a good vidyo.ai alternative?",
    a: "Yes. ClipsHQ produces the same kind of output - ranked, captioned vertical shorts from a long video - with simple minute-based pricing, no watermark on your clips, and clips emailed to you when they're ready. It's a strong alternative if you want predictable costs and accurate multilingual captions.",
  },
  {
    q: "How is ClipsHQ pricing different from vidyo.ai?",
    a: "ClipsHQ charges by video minutes processed, which is easy to predict, and starts at a low entry price. Always check vidyo.ai's current pricing page for its latest plans, as tools update pricing over time.",
  },
  {
    q: "Which is better for non-English captions?",
    a: "ClipsHQ was built with strong right-to-left and South-Asian caption support (Arabic, Urdu, Hindi, Tamil), so word-by-word captions render correctly in those scripts - a meaningful edge for multilingual creators.",
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
          ClipsHQ vs vidyo.ai
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Both turn long videos into captioned vertical shorts. The real differences are in
          pricing you can predict, clean clips without a watermark, and caption accuracy in
          languages beyond English.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          If you&apos;re comparing a <strong className="text-white">vidyo.ai alternative</strong>,
          both tools do the same core job. ClipsHQ&apos;s edge is in the details creators feel
          every day - minute-based pricing instead of credit math, no watermark, hands-off
          email delivery, and captions that render correctly in Arabic, Urdu, Tamil and Hindi.
          Here&apos;s the side-by-side.
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
          minute-based pricing, clips without a watermark, and a hands-off flow where finished
          shorts land in your inbox. It&apos;s especially strong for creators working in
          Arabic, Urdu, Hindi or Tamil, and for anyone who also wants a suite of free tools
          alongside the clip maker.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta />
    </div>
  );
}
