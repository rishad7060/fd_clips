import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { CompareTable, Faq, CompareCta, type CompareRow } from "@/components/compare/CompareTable";

const SLUG = "clipshq-vs-vizard";
const COMPETITOR = "Vizard";
const TITLE = "ClipsHQ vs Vizard - Which AI Clip Tool Is Better?";
const DESCRIPTION =
  "ClipsHQ vs Vizard compared: pricing, credits vs minutes, captions and delivery. See why ClipsHQ is a simpler, cheaper Vizard alternative for making short clips from long video.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "clipshq vs vizard",
    "vizard alternative",
    "vizard vs clipshq",
    "vizard competitor",
    "cheaper than vizard",
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
  { label: "Starting price", clipshq: "Low, entry-friendly plans", competitor: "Established - tiered paid plans" },
  { label: "Free tier", clipshq: "Yes - start free, no card", competitor: "Free tier with monthly cap" },
  { label: "Pricing model", clipshq: "Simple minute-based (pay for video minutes)", competitor: "Minutes-based, tiered" },
  { label: "Watermark on free clips", clipshq: false, competitor: "Watermark on free tier" },
  { label: "Email delivery workflow", clipshq: "Yes - clips emailed when ready, hands-off", competitor: "Dashboard-first" },
  { label: "Free creator tools", clipshq: "Yes - transcript, subtitles, hashtags, tags", competitor: "Limited free tools" },
  { label: "Multilingual / RTL captions", clipshq: "Strong - Arabic, Urdu, Hindi, Tamil (RTL-aware)", competitor: "Broad language support" },
  { label: "Aspect ratios", clipshq: "9:16, 1:1, 4:5, 16:9", competitor: "9:16, 1:1, 16:9" },
  { label: "Editor", clipshq: "Instant inline editor (position, color, text, trim)", competitor: "Online editor" },
];

const FAQS = [
  {
    q: "Is ClipsHQ a good Vizard alternative?",
    a: "Yes. ClipsHQ turns long videos into ranked, captioned vertical shorts just like Vizard, with straightforward minute-based pricing, no watermark on your clips, and clips delivered by email so you don't have to babysit a dashboard. It's a good fit if you want Vizard's outcome at a lower, more predictable cost.",
  },
  {
    q: "How does ClipsHQ pricing compare to Vizard?",
    a: "Both bill around processed minutes, but ClipsHQ keeps it simple with a single transparent minute-based model and lower entry pricing, so you know the cost of a job up front.",
  },
  {
    q: "Do ClipsHQ clips have a watermark like Vizard's free tier?",
    a: "No. ClipsHQ does not watermark your finished clips, so you can publish them without a logo overlay.",
  },
  {
    q: "Which handles non-English captions better?",
    a: "ClipsHQ has strong right-to-left and South-Asian caption support (Arabic, Urdu, Hindi, Tamil) with word-by-word karaoke rendering, which is a real advantage if you create in those languages.",
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
          ClipsHQ vs Vizard
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Both auto-clip long videos into captioned vertical shorts. Vizard is a
          well-known option; ClipsHQ leans into value and simplicity - transparent
          minute pricing, no watermark, and clips emailed to you.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Looking for a <strong className="text-white">Vizard alternative</strong>? Both
          tools cover the same ground. The deciding factors tend to be
          {" "}<strong className="text-white">total cost</strong>, whether the free tier
          watermarks your output, how clips reach you, and caption quality in your
          language. Here&apos;s the honest side-by-side.
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
          Choose <strong className="text-white">ClipsHQ</strong> if you want the lowest,
          most predictable price to turn videos into shorts, clips without a watermark,
          and a hands-off email delivery flow. It shines for multilingual creators
          (Arabic, Urdu, Hindi, Tamil) and for anyone who values the bundled free tools -
          transcripts, subtitles, hashtags and tags - next to the clip maker.
        </p>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">Vizard</strong> is a capable, established tool if
          you&apos;re already invested in its workflow and its online editor suits you.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta />
    </div>
  );
}
