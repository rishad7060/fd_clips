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

const SLUG = "tiktok-clip-generator";
const KEYWORD = "TikTok Clip Generator";
const TITLE = "TikTok Clip Generator - Cut Viral TikToks From Any Video";
const DESCRIPTION =
  "Cut viral TikTok clips from any video automatically. ClipsHQ finds the best moments, reframes to 9:16, and adds accurate multilingual captions - ready to post in minutes. Free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "tiktok clip generator",
    "tiktok clip maker",
    "make tiktok clips",
    "tiktok generator",
    "long video to tiktok",
    "ai tiktok clips",
    "tiktok video cutter",
  ],
});

const FAQS = [
  {
    q: "How do I make TikTok clips from a long video?",
    a: "Paste a video link or upload a file into ClipsHQ. It transcribes the video, finds the most engaging moments, reframes them to vertical 9:16, and burns in captions - producing TikTok-ready clips.",
  },
  {
    q: "Are the clips formatted for TikTok?",
    a: "Yes. Clips export in vertical 9:16, TikTok's native aspect ratio, with the speaker in frame and captions burned in - so they fit the For You feed immediately.",
  },
  {
    q: "Can I turn one long video into many TikToks?",
    a: "Yes. That is the core benefit: a single long upload becomes several ranked, captioned TikTok clips, so you can post consistently without editing each one by hand.",
  },
  {
    q: "Does it caption TikToks in other languages?",
    a: "Yes. ClipsHQ supports many languages and renders right-to-left (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly - a real edge for multilingual TikTok audiences.",
  },
  {
    q: "Is the TikTok clip generator free?",
    a: "You can start free with no credit card. The free plan includes AI clipping and captions within a monthly minute allowance; paid plans add more minutes, no watermark, and faster processing.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Any video into viral TikToks
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          TikTok Clip Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Cut viral-ready TikTok clips from any long video - auto-detected, reframed to
          9:16, and captioned by AI, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          TikTok rewards volume and hooks, and both are hard to sustain by hand. The winning
          move is to mine your long-form content for the moments that already work as
          standalone clips. ClipsHQ automates that: it detects the hooks, cuts them,
          reframes them vertical, and captions them - so you can post several TikToks from a
          single upload.
        </p>
        <p className="mt-4 text-base leading-7">
          Strong captions matter even more on TikTok, where the first second decides
          everything. ClipsHQ&apos;s word-by-word captions give every clip a fighting chance
          on the For You page.
        </p>
      </section>

      <FeatureBlock
        title="Hook detection and scoring"
        bullets={[
          "AI surfaces the moments most likely to hook viewers.",
          "Viral scoring ranks clips so you post your best first.",
          "No scrubbing through long footage.",
        ]}
      >
        <p>
          ClipsHQ reads the transcript and hands you a ranked shortlist of TikTok-worthy
          moments instead of raw video.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Native 9:16 reframing"
        bullets={[
          "Vertical crops that keep the speaker centered.",
          "Landscape footage becomes a native-looking TikTok.",
          "Other aspect ratios available when you need them.",
        ]}
      >
        <p>
          ClipsHQ reframes every clip to TikTok's aspect ratio automatically, so nothing
          looks cropped or off-center on the feed.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Captions built for the first second"
        bullets={[
          "Word-by-word karaoke highlighting for higher retention.",
          "Accurate multilingual + right-to-left rendering.",
          "Instant, in-place editing.",
        ]}
      >
        <p>
          On TikTok, captions carry the hook. ClipsHQ adds them automatically and gets
          non-English scripts right. Posting to other platforms too? See the{" "}
          <Link href="/youtube-shorts-maker" className="text-brand-300 underline-offset-2 hover:underline">
            YouTube Shorts maker
          </Link>{" "}
          and{" "}
          <Link href="/instagram-reel-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Instagram Reel generator
          </Link>
          .
        </p>
      </FeatureBlock>

      <FeatureBlock title="One-click export">
        <p>
          Download finished TikToks with a single click. Comparing tools first? Read the{" "}
          <Link href="/best-ai-video-clipper" className="text-brand-300 underline-offset-2 hover:underline">
            best AI video clipper
          </Link>{" "}
          breakdown.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Make your first TikToks free"
        sub="Paste a link or upload a video and get vertical, captioned TikTok clips in minutes."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
