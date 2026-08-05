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
import { POSITIONING } from "@/lib/proof";

const SLUG = "best-ai-video-clipper";
const KEYWORD = "Best AI Video Clipper";
const TITLE = "Best AI Video Clipper for Global Creators (2026)";
const DESCRIPTION =
  "The fastest AI video clipper for global creators. ClipsHQ finds the best moments, generates accurate multilingual captions, reframes to 9:16 and exports ready-to-post shorts in minutes - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "best ai video clipper",
    "ai video clipper",
    "ai clip generator",
    "best ai clipping tool",
    "ai video clipping software",
    "clip long videos with ai",
    "ai shorts clipper",
  ],
});

const FAQS = [
  {
    q: "What is the best AI video clipper?",
    a: "The best AI video clipper for you depends on how you publish. ClipsHQ is built for speed and global creators: it finds the best moments, scores them, reframes to vertical, and burns in accurate captions - including right-to-left and complex scripts - in minutes, with simple minute-based pricing and a free tier.",
  },
  {
    q: "How does an AI video clipper work?",
    a: "You give it a long video - a podcast, interview, stream or lecture - and the AI transcribes it, identifies the most engaging segments, scores them for virality, reframes them to a vertical 9:16 crop that follows the speaker, and adds word-by-word captions. You get a set of ranked, ready-to-post clips without manual editing.",
  },
  {
    q: "Is there a free AI video clipper?",
    a: "Yes. ClipsHQ has a free plan with no credit card required, including AI clipping and automatic captions within a monthly minute allowance. Paid plans add more minutes, no watermark, and faster processing.",
  },
  {
    q: "Can an AI clipper caption non-English videos?",
    a: "ClipsHQ can. It supports many languages and, crucially, renders right-to-left scripts (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly - something many English-first clippers get wrong.",
  },
  {
    q: "What platforms are the clips made for?",
    a: "Clips export in vertical 9:16 for YouTube Shorts, Instagram Reels and TikTok, with other aspect ratios available. Captions are burned in and the framing follows the speaker, so clips are ready to post straight away.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          {POSITIONING.tagline}
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          The Best AI Video Clipper for Global Creators
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          ClipsHQ finds the best moments in any long video, generates accurate multilingual
          captions, reframes to vertical, and exports ready-to-post shorts - in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          There are plenty of AI clippers now, and most do the same headline trick: cut a
          long video into shorts. What separates a good one from a frustrating one is
          <strong className="text-white"> speed, caption quality, and honest pricing</strong>.
          ClipsHQ is built around those three - and around a fourth thing most tools ignore:
          creators who publish beyond English.
        </p>
        <p className="mt-4 text-base leading-7">
          {POSITIONING.audience} If your audience reads Arabic, Urdu, Tamil or Hindi, a
          clipper that mangles the script is worse than useless. ClipsHQ renders those
          scripts correctly, so your captions look native - and captions are what stop the
          scroll on muted, autoplaying feeds.
        </p>
      </section>

      <FeatureBlock
        title="AI clip detection"
        bullets={[
          "Automatically finds the most engaging segments in a long video.",
          "Works on podcasts, interviews, streams, lectures and more.",
          "No manual scrubbing to find the good parts.",
        ]}
      >
        <p>
          ClipsHQ reads the full transcript and surfaces the moments most likely to perform,
          so you start from a shortlist of strong clips instead of a two-hour timeline.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Viral scoring"
        bullets={[
          "Each clip is scored so you know which to post first.",
          "Prioritize your best moments instead of guessing.",
        ]}
      >
        <p>
          Not every good moment is a great clip. ClipsHQ ranks candidates so your posting
          queue starts with the ones most likely to land.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Accurate multilingual captions"
        bullets={[
          "Word-by-word karaoke highlighting for higher watch time.",
          "Right-to-left aware (Arabic, Urdu) and complex-script ready (Tamil, Hindi).",
          "Fully editable - fix a word or restyle instantly.",
        ]}
      >
        <p>
          Captions are the single biggest lever on short-form retention. ClipsHQ generates
          them automatically and, uniquely, renders non-English scripts correctly. Dedicated
          generators exist for{" "}
          <Link href="/arabic-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Arabic
          </Link>
          ,{" "}
          <Link href="/tamil-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Tamil
          </Link>{" "}
          and{" "}
          <Link href="/urdu-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Urdu
          </Link>
          .
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Vertical reframing and fast export"
        bullets={[
          "9:16 auto-reframe keeps the speaker centered.",
          "One-click download, ready for Shorts, Reels and TikTok.",
          "Instant inline edits - no re-render for text changes.",
        ]}
      >
        <p>
          The last mile matters. ClipsHQ reframes to vertical automatically, exports fast,
          and lets you tweak captions instantly - so the gap between upload and posting is
          measured in minutes. Weighing options? See the{" "}
          <Link href="/compare/best-ai-clip-generator" className="text-brand-300 underline-offset-2 hover:underline">
            best AI clip generator roundup
          </Link>{" "}
          or the{" "}
          <Link href="/opus-clip-alternative" className="text-brand-300 underline-offset-2 hover:underline">
            Opus Clip alternative
          </Link>{" "}
          page.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Clip your first video free"
        sub={POSITIONING.promise}
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
