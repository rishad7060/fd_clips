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

const SLUG = "ai-shorts-generator";
const KEYWORD = "AI Shorts Generator";
const TITLE = "AI Shorts Generator - Long Video to Vertical Shorts";
const DESCRIPTION =
  "Generate ready-to-post vertical shorts from any long video with AI. ClipsHQ detects the best moments, reframes to 9:16 and adds accurate multilingual captions in minutes - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "ai shorts generator",
    "shorts generator",
    "ai shorts maker",
    "generate shorts from video",
    "long video to shorts",
    "ai vertical video generator",
    "auto shorts creator",
  ],
});

const FAQS = [
  {
    q: "What is an AI shorts generator?",
    a: "It is a tool that takes a long video and automatically produces short, vertical, ready-to-post clips. ClipsHQ transcribes the video, finds the most engaging moments, scores them, reframes them to 9:16, and burns in captions - so you get shorts without manual editing.",
  },
  {
    q: "What videos can I turn into shorts?",
    a: "Any long-form video with clear speech: podcasts, interviews, webinars, streams, lectures, vlogs and more. Paste a public link or upload your own file.",
  },
  {
    q: "Are the shorts ready to post?",
    a: "Yes. Each short is vertical 9:16, captioned, and reframed to keep the speaker in view - so you can download and post straight to Shorts, Reels or TikTok.",
  },
  {
    q: "Does it support non-English shorts?",
    a: "Yes. ClipsHQ supports many languages and renders right-to-left (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly, which most English-first tools do not.",
  },
  {
    q: "Is the AI shorts generator free?",
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
          Long video in, shorts out
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          AI Shorts Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Drop in any long video and get ready-to-post vertical shorts - detected, reframed
          and captioned by AI, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          The hard part of short-form is not posting - it is producing enough good clips to
          post consistently. An AI shorts generator removes that bottleneck: instead of
          editing each short by hand, you let the AI find the moments, cut them, reframe
          them and caption them. ClipsHQ does all four in one pass.
        </p>
        <p className="mt-4 text-base leading-7">
          The result is a repeatable engine. One long upload becomes a queue of shorts, each
          with word-by-word captions that hold attention on muted feeds - and each ready to
          publish without touching a timeline.
        </p>
      </section>

      <FeatureBlock
        title="AI moment detection and scoring"
        bullets={[
          "Finds the most engaging segments in any long video.",
          "Scores clips so you post the strongest first.",
          "No manual scrubbing to find the good parts.",
        ]}
      >
        <p>
          ClipsHQ reads the transcript and surfaces the hooks and highlights most likely to
          perform, giving you a ranked shortlist instead of raw footage.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Automatic 9:16 reframing"
        bullets={[
          "Vertical crops that keep the speaker centered.",
          "Turns landscape footage into native-looking shorts.",
          "Other aspect ratios available when you need them.",
        ]}
      >
        <p>
          Reframing is what makes a short feel native rather than a cropped afterthought.
          ClipsHQ handles it automatically for every clip.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Captions that convert"
        bullets={[
          "Word-by-word karaoke highlighting for higher watch time.",
          "Accurate multilingual + right-to-left rendering.",
          "Instant, in-place editing.",
        ]}
      >
        <p>
          Captions are the biggest lever on short-form retention. ClipsHQ generates them
          automatically and, uniquely, gets non-English scripts right. Building for a
          specific platform? See the{" "}
          <Link href="/youtube-shorts-maker" className="text-brand-300 underline-offset-2 hover:underline">
            YouTube Shorts maker
          </Link>{" "}
          and{" "}
          <Link href="/tiktok-clip-generator" className="text-brand-300 underline-offset-2 hover:underline">
            TikTok clip generator
          </Link>
          .
        </p>
      </FeatureBlock>

      <FeatureBlock title="One-click export">
        <p>
          Download finished shorts with a single click and post them anywhere. Weighing
          options first? Read the{" "}
          <Link href="/best-ai-video-clipper" className="text-brand-300 underline-offset-2 hover:underline">
            best AI video clipper
          </Link>{" "}
          breakdown.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Generate your first shorts free"
        sub="Paste a link or upload a video and get ready-to-post vertical shorts in minutes."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
