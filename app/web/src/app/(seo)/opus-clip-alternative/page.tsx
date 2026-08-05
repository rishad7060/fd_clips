import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seoMeta";
import { SeoSchema, Breadcrumbs, RelatedSeoPages } from "@/components/seo/SeoSchema";
import {
  SeoCta,
  SeoFaq,
  FeatureBlock,
  SeoProofBand,
  LanguageChips,
} from "@/components/seo/SeoBlocks";

const SLUG = "opus-clip-alternative";
const KEYWORD = "Opus Clip Alternative";
const TITLE = "Opus Clip Alternative - Cheaper, No Watermark, Multilingual";
const DESCRIPTION =
  "Looking for an Opus Clip alternative? ClipsHQ turns long videos into ranked, captioned vertical shorts with simple minute-based pricing, no watermark, and strong multilingual captions - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "opus clip alternative",
    "opus clip alternatives",
    "alternative to opus clip",
    "opus clip competitor",
    "cheaper than opus clip",
    "opus clip free alternative",
    "best opus clip alternative",
  ],
});

const FAQS = [
  {
    q: "What is the best Opus Clip alternative?",
    a: "If you want the same outcome - a long video turned into ranked, captioned vertical shorts - with simpler pricing and no watermark, ClipsHQ is a strong Opus Clip alternative. It uses minute-based pricing so you always know a job's cost, starts free, and has genuinely strong right-to-left and multilingual captions.",
  },
  {
    q: "Is there a free Opus Clip alternative?",
    a: "Yes. ClipsHQ has a free plan with no credit card required, including AI clipping and automatic captions within a monthly minute allowance. Paid plans add more minutes, no watermark, and faster processing.",
  },
  {
    q: "How is ClipsHQ cheaper than Opus Clip?",
    a: "ClipsHQ charges by the video minutes you process rather than a credits system, which most creators find easier to predict, and it starts at a lower entry price. You can see the full side-by-side on our ClipsHQ vs Opus Clip comparison.",
  },
  {
    q: "Does ClipsHQ put a watermark on clips?",
    a: "No watermark is baked into your finished clips on paid plans, so you can post them anywhere without a logo. (If a free-tier watermark is enabled, it is a small, removable mark - upgrade to remove it entirely.)",
  },
  {
    q: "Is ClipsHQ better for non-English content?",
    a: "For creators working in Arabic, Urdu, Hindi or Tamil, yes - ClipsHQ was built with right-to-left and complex-script captions in mind, so word-by-word captions render correctly where English-first tools often fail.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          A simpler, cheaper alternative
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          The Opus Clip Alternative Built for Global Creators
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Same outcome - long videos into ranked, captioned vertical shorts - with simple
          minute-based pricing, no watermark, and captions that actually handle languages
          beyond English.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Opus Clip helped define the AI-clipping category, and it is a capable tool. But
          a lot of creators go looking for an alternative for the same few reasons: the
          <strong className="text-white"> credits pricing is hard to predict</strong>,
          lower tiers can carry a watermark, and captions in non-English languages -
          especially right-to-left scripts - do not always render well. ClipsHQ was built
          to fix exactly those friction points.
        </p>
        <p className="mt-4 text-base leading-7">
          The core job is identical: you give it a long video, it finds the best moments,
          scores them, reframes them to vertical, burns in word-by-word captions, and hands
          you ready-to-post clips. Where ClipsHQ differs is in the details that decide
          whether a tool is a pleasure or a chore to use.
        </p>
      </section>

      <FeatureBlock
        title="Predictable minute-based pricing"
        bullets={[
          "Pay for the video minutes you process - no credit math.",
          "Know a job's cost before you run it.",
          "Starts free, with an honest monthly allowance.",
        ]}
      >
        <p>
          Credits are the number one complaint about clipping tools: it is never obvious how
          many a job will burn. ClipsHQ prices by source minutes, so the cost is legible up
          front. See the full breakdown on our{" "}
          <Link href="/compare/clipshq-vs-opus-clip" className="text-brand-300 underline-offset-2 hover:underline">
            ClipsHQ vs Opus Clip comparison
          </Link>
          .
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="No watermark on your clips"
        bullets={[
          "Post clips anywhere without a baked-in logo (paid plans).",
          "A clean, professional finish out of the box.",
        ]}
      >
        <p>
          A watermark on lower tiers quietly advertises the tool on every video you post.
          ClipsHQ keeps your finished clips clean on paid plans so the spotlight stays on
          your content.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Genuinely multilingual captions"
        bullets={[
          "Right-to-left aware: Arabic and Urdu render correctly.",
          "Complex scripts like Tamil and Hindi display cleanly.",
          "Word-by-word karaoke highlighting in every supported language.",
        ]}
      >
        <p>
          If you publish beyond English, this is the biggest difference. ClipsHQ treats
          right-to-left and complex scripts as first-class, so your captions look native
          rather than broken. Explore the dedicated{" "}
          <Link href="/arabic-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Arabic
          </Link>
          ,{" "}
          <Link href="/urdu-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Urdu
          </Link>{" "}
          and{" "}
          <Link href="/tamil-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Tamil
          </Link>{" "}
          subtitle generators.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="The same core AI features you expect"
        bullets={[
          "AI clip detection that surfaces the most engaging moments.",
          "Viral scoring so you know which clips to post first.",
          "9:16 auto-reframe and one-click download.",
          "Instant inline editing - no re-render for text changes.",
        ]}
      >
        <p>
          Switching does not mean giving anything up. ClipsHQ covers the full workflow -
          detection, scoring, reframing, captioning and editing - plus a suite of free
          creator tools like transcript and subtitle downloaders.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Try the Opus Clip alternative free"
        sub="Paste a link or upload a video and get ranked, captioned vertical shorts in minutes - no watermark, no credit math."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
