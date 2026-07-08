import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { CompareTable, Faq, CompareCta, type CompareRow } from "@/components/compare/CompareTable";

const SLUG = "clipshq-vs-opus-clip";
const COMPETITOR = "Opus Clip";
const TITLE = "ClipsHQ vs Opus Clip - Which AI Clip Tool Is Better?";
const DESCRIPTION =
  "ClipsHQ vs Opus Clip compared: pricing, watermarks, captions and workflow. See why ClipsHQ is a simpler, cheaper Opus Clip alternative for turning long videos into shorts.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "clipshq vs opus clip",
    "opus clip alternative",
    "opus clip vs clipshq",
    "opus clip competitor",
    "cheaper than opus clip",
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
  { label: "Starting price", clipshq: "Low, entry-friendly plans", competitor: "Popular, established - priced higher" },
  { label: "Free tier", clipshq: "Yes - start free, no card", competitor: "Free trial available" },
  { label: "Pricing model", clipshq: "Simple minute-based (pay for video minutes)", competitor: "Credits-based" },
  { label: "Watermark on free clips", clipshq: false, competitor: "Watermark on free/lower tiers" },
  { label: "Email delivery workflow", clipshq: "Yes - clips emailed when ready, hands-off", competitor: "Dashboard-first" },
  { label: "Free creator tools", clipshq: "Yes - transcript, subtitles, hashtags, tags", competitor: "Limited free tools" },
  { label: "Multilingual / RTL captions", clipshq: "Strong - Arabic, Urdu, Hindi, Tamil (RTL-aware)", competitor: "Broad language support" },
  { label: "Aspect ratios", clipshq: "9:16, 1:1, 4:5, 16:9", competitor: "9:16, 1:1, 16:9" },
  { label: "Editor", clipshq: "Instant inline editor (position, color, text, trim)", competitor: "Full timeline editor" },
];

const FAQS = [
  {
    q: "Is ClipsHQ a good Opus Clip alternative?",
    a: "Yes. ClipsHQ does the same core job - it finds the best moments in a long video and turns them into ranked, captioned vertical shorts - with simpler minute-based pricing, no watermark on your clips, and clips delivered straight to your inbox. It's a strong fit if you want Opus Clip's outcome without the credit math or the higher price.",
  },
  {
    q: "How is ClipsHQ pricing different from Opus Clip?",
    a: "ClipsHQ charges by video minutes processed, so you always know what a job will cost before you run it. Opus Clip uses a credits model, which many creators find harder to predict. ClipsHQ also starts at a lower price point.",
  },
  {
    q: "Does ClipsHQ put a watermark on my clips?",
    a: "No. ClipsHQ does not watermark your finished clips, so you can post them anywhere without a logo baked in.",
  },
  {
    q: "Which is better for non-English captions?",
    a: "ClipsHQ was built with strong right-to-left and South-Asian caption support (Arabic, Urdu, Hindi, Tamil), so word-by-word karaoke captions render correctly in those scripts. If you create in those languages, that's a meaningful edge.",
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
          ClipsHQ vs Opus Clip
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Both turn long videos into ranked, captioned vertical shorts. Opus Clip is
          the established name; ClipsHQ is the value pick - simpler minute-based
          pricing, no watermark, and clips emailed to you hands-off.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          If you&apos;re searching for an <strong className="text-white">Opus Clip alternative</strong>,
          the honest answer is that both tools produce the same kind of output. The
          differences are in the details: <strong className="text-white">how you pay</strong>,
          whether your free clips carry a watermark, how the clips reach you, and how well
          the captions handle languages beyond English. Here&apos;s the side-by-side.
        </p>
      </section>

      <section className="mt-10">
        <CompareTable competitorName={COMPETITOR} rows={ROWS} />
        <p className="mt-3 text-center text-xs text-ink-500">
          Competitor details are kept high-level and may change - always check
          {" "}
          {COMPETITOR}&apos;s current pricing page. ClipsHQ figures reflect our own plans.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-2xl text-ink-300">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
          Who should choose ClipsHQ
        </h2>
        <p className="mt-4 text-base leading-7">
          Choose <strong className="text-white">ClipsHQ</strong> if you want predictable
          minute-based pricing instead of credits, clips without a watermark on the free
          tier, and a hands-off flow where finished shorts land in your inbox. It&apos;s
          especially strong for creators working in Arabic, Urdu, Hindi or Tamil, and for
          anyone who also wants a suite of free tools (transcripts, subtitles, hashtags,
          tags) alongside the clip maker.
        </p>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">Opus Clip</strong> is a solid, established choice
          if you specifically want its mature timeline editor and are comfortable with a
          credits model at a higher price.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta />
    </div>
  );
}
