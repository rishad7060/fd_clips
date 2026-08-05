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

const SLUG = "youtube-shorts-maker";
const KEYWORD = "YouTube Shorts Maker";
const TITLE = "YouTube Shorts Maker - Long Videos to Shorts in Minutes";
const DESCRIPTION =
  "Make YouTube Shorts from long videos automatically. ClipsHQ finds the best moments, reframes to 9:16, and adds accurate multilingual captions - ready to upload in minutes. Free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "youtube shorts maker",
    "youtube shorts generator",
    "make youtube shorts",
    "youtube shorts creator",
    "long video to youtube shorts",
    "youtube shorts from video",
    "ai youtube shorts",
  ],
});

const FAQS = [
  {
    q: "How do I make YouTube Shorts from a long video?",
    a: "Paste your YouTube video link or upload a file into ClipsHQ. It transcribes the video, finds the best moments, reframes them to vertical 9:16, and burns in captions - producing a batch of Shorts ready to upload.",
  },
  {
    q: "Will the Shorts fit YouTube's format?",
    a: "Yes. Clips export in vertical 9:16, the native Shorts aspect ratio, with captions burned in and the speaker kept in frame - so they look right the moment they go live.",
  },
  {
    q: "Can I make Shorts from my existing long-form videos?",
    a: "That is exactly the use case. Repurpose your back catalogue: each long upload becomes several Shorts, extending the reach of content you already published.",
  },
  {
    q: "Does it caption Shorts in other languages?",
    a: "Yes. ClipsHQ supports many languages and renders right-to-left (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly.",
  },
  {
    q: "Is the YouTube Shorts maker free?",
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
          Repurpose long-form into Shorts
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Shorts Maker
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Turn your long YouTube videos into a batch of ready-to-upload Shorts -
          auto-detected, reframed to 9:16, and captioned, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Shorts are how YouTube channels reach new viewers now, and the fastest way to feed
          the format is to mine the long-form videos you already have. Every upload, stream
          and interview is full of Shorts-worthy moments - the problem is finding and
          cutting them. ClipsHQ automates the whole chain: detect, cut, reframe, caption.
        </p>
        <p className="mt-4 text-base leading-7">
          Paste a link, get a queue of vertical Shorts with captions burned in. It turns one
          publish into a week of Shorts without a second edit session.
        </p>
      </section>

      <FeatureBlock
        title="Find the Shorts hiding in your videos"
        bullets={[
          "AI reads the transcript and surfaces the best moments.",
          "Viral scoring ranks them so you upload the strongest first.",
          "No scrubbing through hours of footage.",
        ]}
      >
        <p>
          Instead of rewatching a two-hour video to find the good 30 seconds, ClipsHQ hands
          you a ranked shortlist of clip-worthy moments.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Native 9:16 reframing"
        bullets={[
          "Vertical crops that keep the speaker centered.",
          "Landscape footage becomes a native-looking Short.",
          "Ready for the Shorts shelf the moment it uploads.",
        ]}
      >
        <p>
          ClipsHQ reframes every clip to the Shorts aspect ratio automatically, so nothing
          looks cropped or off-center.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Captions that hold viewers"
        bullets={[
          "Word-by-word karaoke highlighting for higher retention.",
          "Accurate multilingual + right-to-left rendering.",
          "Instant, in-place editing.",
        ]}
      >
        <p>
          Captions are essential on Shorts, where many viewers watch muted. ClipsHQ adds
          them automatically. Making clips for other platforms too? See the{" "}
          <Link href="/instagram-reel-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Instagram Reel generator
          </Link>{" "}
          and{" "}
          <Link href="/tiktok-clip-generator" className="text-brand-300 underline-offset-2 hover:underline">
            TikTok clip generator
          </Link>
          .
        </p>
      </FeatureBlock>

      <FeatureBlock title="Free tools for YouTube creators">
        <p>
          Beyond Shorts, ClipsHQ offers free tools that pair well with a YouTube workflow -
          a{" "}
          <Link href="/tools/youtube-to-transcript" className="text-brand-300 underline-offset-2 hover:underline">
            transcript generator
          </Link>
          , subtitle downloader, and more in the{" "}
          <Link href="/tools" className="text-brand-300 underline-offset-2 hover:underline">
            free tools hub
          </Link>
          .
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Make your first YouTube Shorts free"
        sub="Paste a YouTube link or upload a video and get vertical, captioned Shorts in minutes."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
