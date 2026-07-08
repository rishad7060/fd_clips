import type { Metadata } from "next";
import { CompareSchema, Breadcrumbs, OtherComparisons } from "@/components/compare/CompareSchema";
import { CompareTable, Faq, CompareCta, type CompareRow } from "@/components/compare/CompareTable";

const SLUG = "clipshq-vs-submagic";
const COMPETITOR = "Submagic";
const TITLE = "ClipsHQ vs Submagic - Which AI Clip Tool Is Better?";
const DESCRIPTION =
  "ClipsHQ vs Submagic compared: captions, clip generation, pricing and delivery. See why ClipsHQ is a simpler, cheaper Submagic alternative - especially for multilingual captions.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "clipshq vs submagic",
    "submagic alternative",
    "submagic vs clipshq",
    "submagic competitor",
    "cheaper than submagic",
    "ai caption tool comparison",
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
  { label: "Free tier", clipshq: "Yes - start free, no card", competitor: "Free trial / limited tier" },
  { label: "Pricing model", clipshq: "Simple minute-based (pay for video minutes)", competitor: "Subscription tiers" },
  { label: "Watermark on free clips", clipshq: false, competitor: "Watermark on free/trial" },
  { label: "Email delivery workflow", clipshq: "Yes - clips emailed when ready, hands-off", competitor: "Dashboard-first" },
  { label: "Free creator tools", clipshq: "Yes - transcript, subtitles, hashtags, tags", competitor: "Limited free tools" },
  { label: "Multilingual / RTL captions", clipshq: "Strong - Arabic, Urdu, Hindi, Tamil (RTL-aware)", competitor: "Broad language support" },
  { label: "Aspect ratios", clipshq: "9:16, 1:1, 4:5, 16:9", competitor: "9:16, 1:1, 16:9" },
  { label: "Editor", clipshq: "Instant inline editor (position, color, text, trim)", competitor: "Caption-focused editor" },
];

const FAQS = [
  {
    q: "Is ClipsHQ a good Submagic alternative?",
    a: "Yes. Submagic is known for its punchy captions, and ClipsHQ delivers word-by-word karaoke captions too - plus it does the full job of finding the best moments in a long video and turning them into ranked vertical shorts, at a lower, minute-based price with clips emailed to you.",
  },
  {
    q: "How do the captions compare?",
    a: "Both offer styled, animated word-by-word captions. ClipsHQ's edge is language coverage: it has strong right-to-left and South-Asian support (Arabic, Urdu, Hindi, Tamil), so captions render correctly in scripts many caption tools handle poorly.",
  },
  {
    q: "Is ClipsHQ cheaper than Submagic?",
    a: "ClipsHQ starts at a low, entry-friendly price and bills by video minutes, which is simpler to reason about than subscription tiers. Check both current pricing pages, but ClipsHQ is positioned as the value option.",
  },
  {
    q: "Do ClipsHQ clips have a watermark?",
    a: "No. ClipsHQ does not watermark your finished clips, so they're ready to post as-is.",
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
          ClipsHQ vs Submagic
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Submagic is loved for its captions; ClipsHQ delivers styled captions and
          full auto-clipping - with simpler minute pricing, no watermark, and standout
          support for Arabic, Urdu, Hindi and Tamil.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Comparing ClipsHQ and Submagic as a <strong className="text-white">Submagic alternative</strong>
          {" "}usually comes down to captions and scope. Both produce animated word-by-word
          captions; ClipsHQ also finds the best moments across a long video automatically
          and emails you the finished shorts. If you caption in non-Latin scripts, ClipsHQ&apos;s
          <strong className="text-white"> multilingual and RTL support</strong> is the differentiator.
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
          Choose <strong className="text-white">ClipsHQ</strong> if you want great captions
          plus full auto-clipping in one tool, transparent minute-based pricing, no
          watermark, and clips delivered by email. It&apos;s the clear pick for creators
          working in Arabic, Urdu, Hindi or Tamil, and for anyone who wants free
          transcript, subtitle, hashtag and tag tools alongside the clip maker.
        </p>
        <p className="mt-4 text-base leading-7">
          <strong className="text-white">Submagic</strong> is a strong choice if captions are
          your only need and its specific caption styles are exactly what you want.
        </p>
      </section>

      <Faq faqs={FAQS} />
      <OtherComparisons currentSlug={SLUG} />
      <CompareCta />
    </div>
  );
}
