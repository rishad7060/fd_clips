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

const SLUG = "podcast-clip-generator";
const KEYWORD = "Podcast Clip Generator";
const TITLE = "Podcast Clip Generator - Turn Episodes Into Shorts";
const DESCRIPTION =
  "Turn long podcast episodes into ranked, captioned vertical clips automatically. ClipsHQ finds the best moments, reframes to 9:16 and burns in accurate multilingual captions - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "podcast clip generator",
    "podcast clips",
    "podcast to shorts",
    "podcast clip maker",
    "ai podcast clips",
    "turn podcast into clips",
    "podcast video clips",
  ],
});

const FAQS = [
  {
    q: "How do I turn a podcast into clips?",
    a: "Paste your episode link or upload the file, and ClipsHQ transcribes it, finds the most engaging moments, scores them, reframes them to vertical, and burns in captions. You get a set of ranked, ready-to-post clips from a single episode - no editing timeline required.",
  },
  {
    q: "Does it work for audio-only podcasts?",
    a: "ClipsHQ works best with video podcasts (so it can reframe the speaker), but it can caption and clip any source with clear speech. For audio-only shows, the captions and moment detection still work - you'd pair them with your own visual or waveform.",
  },
  {
    q: "How many clips will I get from one episode?",
    a: "It depends on the episode length and how many strong moments it contains, but a typical long-form episode yields several ranked clips. You choose how many to generate.",
  },
  {
    q: "Can it caption podcasts in other languages?",
    a: "Yes. ClipsHQ supports many languages and renders right-to-left (Arabic, Urdu) and complex scripts (Tamil, Hindi) correctly - useful for multilingual podcast audiences.",
  },
  {
    q: "Is the podcast clip generator free?",
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
          One episode, a week of clips
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Podcast Clip Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Turn every long episode into a batch of ranked, captioned vertical clips -
          automatically. ClipsHQ finds the moments worth posting so you don&apos;t have to
          scrub through hours of audio.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Podcasts are a goldmine of short-form content, but mining it by hand is brutal.
          A single 90-minute episode can hide a dozen postable moments - and finding,
          cutting, reframing and captioning each one is hours of work. That is exactly the
          job ClipsHQ automates. Feed it the episode and it hands back the clips.
        </p>
        <p className="mt-4 text-base leading-7">
          The workflow is built for consistency: publish one episode, get a week of shorts
          for YouTube, Reels and TikTok, each with word-by-word captions that keep viewers
          watching on muted, autoplaying feeds.
        </p>
      </section>

      <FeatureBlock
        title="Automatic moment detection"
        bullets={[
          "Reads the full transcript and surfaces the strongest segments.",
          "Scores each candidate so you post your best moments first.",
          "No scrubbing through hours of recording.",
        ]}
      >
        <p>
          ClipsHQ identifies the hooks, punchlines and standout exchanges that make good
          shorts, so you start from a shortlist instead of a raw timeline.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Speaker-aware vertical reframing"
        bullets={[
          "9:16 auto-reframe keeps the active speaker centered.",
          "Clean vertical crops from a wide two-person setup.",
          "Other aspect ratios available for different placements.",
        ]}
      >
        <p>
          Podcast footage is usually shot wide. ClipsHQ reframes it to vertical and keeps
          the speaker in frame, so a landscape interview becomes a native-looking short.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Accurate, multilingual captions"
        bullets={[
          "Word-by-word karaoke highlighting for higher retention.",
          "Right-to-left and complex scripts render correctly.",
          "Fully editable - fix a name or term instantly.",
        ]}
      >
        <p>
          Podcasts are full of names, jargon and cross-talk. ClipsHQ captions them
          accurately and lets you correct anything in seconds. If your audience is
          multilingual, explore the dedicated{" "}
          <Link href="/arabic-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Arabic
          </Link>{" "}
          and{" "}
          <Link href="/urdu-subtitle-generator" className="text-brand-300 underline-offset-2 hover:underline">
            Urdu
          </Link>{" "}
          subtitle generators.
        </p>
      </FeatureBlock>

      <FeatureBlock title="Fast export and instant edits">
        <p>
          Download ready-to-post clips with one click, and tweak captions instantly with no
          re-render for text changes. Comparing tools? See how ClipsHQ stacks up as the{" "}
          <Link href="/best-ai-video-clipper" className="text-brand-300 underline-offset-2 hover:underline">
            best AI video clipper
          </Link>
          .
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Clip your first episode free"
        sub="Paste a podcast link or upload a file and get a batch of captioned vertical clips in minutes."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
