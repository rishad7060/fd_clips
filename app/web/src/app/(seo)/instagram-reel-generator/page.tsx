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

const SLUG = "instagram-reel-generator";
const KEYWORD = "Instagram Reel Generator";
const TITLE = "Instagram Reel Generator - Long Video to Reels, Captioned";
const DESCRIPTION =
  "Create Instagram Reels from long-form video automatically. ClipsHQ finds the best moments, reframes to 9:16, and adds accurate multilingual captions - ready to post in minutes. Free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "instagram reel generator",
    "instagram reels maker",
    "make instagram reels",
    "reels generator",
    "long video to reels",
    "ai instagram reels",
    "reel clip generator",
  ],
});

const FAQS = [
  {
    q: "How do I make Instagram Reels from a long video?",
    a: "Paste a video link or upload a file into ClipsHQ. It transcribes the video, finds the most engaging moments, reframes them to vertical 9:16, and burns in captions - producing Reels ready to post.",
  },
  {
    q: "Are the Reels the right size for Instagram?",
    a: "Yes. Clips export in vertical 9:16, the native Reels aspect ratio, with the speaker kept in frame and captions burned in - so they look right on the Reels feed immediately.",
  },
  {
    q: "Can I repurpose YouTube or podcast content into Reels?",
    a: "Absolutely. Feed in a long YouTube video, podcast or interview and ClipsHQ turns it into multiple Reels, so one piece of content reaches your Instagram audience too.",
  },
  {
    q: "Does it caption Reels in other languages?",
    a: "Yes. ClipsHQ supports many languages and renders right-to-left (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly - useful for reaching multilingual followers.",
  },
  {
    q: "Is the Instagram Reel generator free?",
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
          Long video to Reels, captioned
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Instagram Reel Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Turn any long video into a batch of ready-to-post Instagram Reels - detected,
          reframed to 9:16, and captioned by AI, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Reels reward consistency, and consistency is hard when every Reel is a manual
          edit. The shortcut is repurposing: your long videos already contain the moments
          that make great Reels. ClipsHQ finds them, reframes them vertical, and captions
          them - so posting daily stops being a production problem.
        </p>
        <p className="mt-4 text-base leading-7">
          One upload becomes a queue of Reels, each with word-by-word captions that keep
          viewers watching as they scroll a muted feed.
        </p>
      </section>

      <FeatureBlock
        title="Find your best Reel moments"
        bullets={[
          "AI surfaces the most engaging segments automatically.",
          "Viral scoring ranks them so you post the strongest first.",
          "No scrubbing through long footage.",
        ]}
      >
        <p>
          ClipsHQ reads the transcript and hands you a ranked shortlist of Reel-worthy
          moments instead of raw video.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Native 9:16 reframing"
        bullets={[
          "Vertical crops that keep the speaker centered.",
          "Landscape footage becomes a native-looking Reel.",
          "Other aspect ratios available for feed posts.",
        ]}
      >
        <p>
          ClipsHQ reframes every clip to the Reels aspect ratio automatically, so nothing
          looks cropped or off-center on the feed.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Captions that stop the scroll"
        bullets={[
          "Word-by-word karaoke highlighting for higher retention.",
          "Accurate multilingual + right-to-left rendering.",
          "Instant, in-place editing.",
        ]}
      >
        <p>
          On Instagram, most Reels autoplay muted - captions are what earn the first few
          seconds. ClipsHQ adds them automatically. Posting to other platforms too? See the{" "}
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
          Download finished Reels with a single click. Comparing tools first? Read the{" "}
          <Link href="/best-ai-video-clipper" className="text-brand-300 underline-offset-2 hover:underline">
            best AI video clipper
          </Link>{" "}
          breakdown.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Make your first Reels free"
        sub="Paste a link or upload a video and get vertical, captioned Instagram Reels in minutes."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
