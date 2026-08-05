import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seoMeta";
import { SeoSchema, Breadcrumbs, RelatedSeoPages } from "@/components/seo/SeoSchema";
import {
  SeoCta,
  SeoFaq,
  FeatureBlock,
  SeoProofBand,
  LanguageChips,
} from "@/components/seo/SeoBlocks";

const SLUG = "arabic-subtitle-generator";
const KEYWORD = "Arabic Subtitle Generator";
const TITLE = "Arabic Subtitle Generator - Accurate RTL Captions in Minutes";
const DESCRIPTION =
  "Generate accurate Arabic subtitles and right-to-left captions automatically. ClipsHQ transcribes, times and burns in Arabic captions for shorts, reels and long-form video - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "arabic subtitle generator",
    "arabic caption generator",
    "arabic subtitles",
    "auto arabic captions",
    "rtl subtitle generator",
    "add arabic subtitles to video",
    "arabic video captions ai",
  ],
});

const FAQS = [
  {
    q: "How does the Arabic subtitle generator work?",
    a: "Paste a video link or upload a file and ClipsHQ automatically transcribes the speech, times each word, and renders Arabic subtitles that are correctly aligned right-to-left. You can generate captions for a full video or for individual short clips, then download or burn them in.",
  },
  {
    q: "Are the Arabic captions right-to-left aware?",
    a: "Yes. ClipsHQ was built with RTL scripts in mind, so Arabic text flows right-to-left, punctuation sits correctly, and word-by-word karaoke highlighting tracks the spoken word in the right direction - something many English-first tools get wrong.",
  },
  {
    q: "Can I edit the Arabic subtitles after they are generated?",
    a: "Yes. Every caption is editable - fix a word, adjust timing, change the style, position or color - and the changes apply instantly without a re-render for text edits.",
  },
  {
    q: "Is the Arabic subtitle generator free?",
    a: "You can start free with no credit card. The free plan includes automatic captions and AI clipping with a monthly minute allowance; paid plans add more minutes, no watermark, and faster processing.",
  },
  {
    q: "What video formats and lengths are supported?",
    a: "You can paste a YouTube or other public video link, or upload your own file. ClipsHQ handles both short clips and long-form content, and outputs vertical 9:16 clips ready for Shorts, Reels and TikTok - or standard formats for other placements.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Arabic captions - RTL aware
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Arabic Subtitle Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Generate accurate, right-to-left Arabic subtitles for any video - automatically.
          ClipsHQ transcribes the speech, times every word, and renders clean Arabic
          captions you can post anywhere, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Most AI caption tools are built English-first, and it shows the moment you feed
          them Arabic: text renders left-to-right, letters break their joins, and the
          word-by-word highlight runs the wrong way. ClipsHQ takes Arabic seriously. It was
          designed from the start to handle <strong className="text-white">right-to-left
          scripts</strong>, so your captions read the way your audience actually reads -
          cleanly, in the correct direction, with the karaoke highlight tracking the spoken
          word right-to-left.
        </p>
        <p className="mt-4 text-base leading-7">
          Whether you are a creator publishing to an Arabic-speaking audience across the
          Gulf, the Levant, North Africa or the diaspora, accurate on-screen captions are
          what stop the scroll. Silent autoplay is the default on every feed, so
          captions are not optional - they are the difference between a viewer watching and
          a viewer swiping past.
        </p>
      </section>

      <FeatureBlock
        title="Automatic Arabic transcription and timing"
        bullets={[
          "Speech-to-text tuned for spoken Arabic, including fast, natural delivery.",
          "Word-level timestamps so captions land exactly on the spoken word.",
          "Handles both Modern Standard Arabic and everyday spoken dialects.",
        ]}
      >
        <p>
          Paste a link or upload a file and ClipsHQ does the heavy lifting: it transcribes
          the audio, aligns each word to the timeline, and produces subtitles that stay in
          sync throughout. No manual timing, no line-by-line typing.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="True right-to-left rendering"
        bullets={[
          "RTL text flow with correct letter joining and punctuation placement.",
          "Word-by-word karaoke highlighting that runs in the right direction.",
          "Caption styles that look native, not bolted on.",
        ]}
      >
        <p>
          This is where ClipsHQ pulls ahead of English-first clippers. Arabic is not just
          another language toggle - it needs the whole caption engine to respect
          right-to-left rendering. ClipsHQ does, so your captions look professionally set
          rather than machine-mangled.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="From long video to captioned shorts"
        bullets={[
          "AI finds the most engaging moments in a long video automatically.",
          "9:16 auto-reframe keeps the speaker centered for vertical feeds.",
          "One-click download, ready to post to Shorts, Reels and TikTok.",
        ]}
      >
        <p>
          The Arabic subtitle generator is part of a full clip pipeline. Drop in a long
          podcast, lecture or interview and ClipsHQ will not only caption it - it will find
          the best moments, reframe them vertically, and hand you a set of ranked,
          ready-to-post clips with Arabic captions already burned in.
        </p>
      </FeatureBlock>

      <FeatureBlock title="Edit anything, instantly">
        <p>
          Automatic does not mean locked. Every caption is editable: correct a word, nudge
          the timing, or change the style, color and position. Text edits apply instantly -
          no waiting on a re-render - so you stay in flow while you polish.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Create Arabic-captioned shorts in minutes"
        sub="Start free - paste a link or upload a video and get accurate RTL Arabic captions automatically."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
