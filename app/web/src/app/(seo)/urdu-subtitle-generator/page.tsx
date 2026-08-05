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

const SLUG = "urdu-subtitle-generator";
const KEYWORD = "Urdu Subtitle Generator";
const TITLE = "Urdu Subtitle Generator - Accurate RTL Urdu Captions";
const DESCRIPTION =
  "Generate accurate Urdu subtitles and right-to-left captions automatically. ClipsHQ transcribes, times and renders Urdu captions for shorts, reels and long-form video - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "urdu subtitle generator",
    "urdu caption generator",
    "urdu subtitles",
    "auto urdu captions",
    "rtl urdu captions",
    "add urdu subtitles to video",
    "urdu video captions ai",
  ],
});

const FAQS = [
  {
    q: "How does the Urdu subtitle generator work?",
    a: "Paste a video link or upload a file and ClipsHQ automatically transcribes the Urdu speech, times each word, and renders subtitles aligned right-to-left. Caption a full video or individual clips, then edit, download or burn them in.",
  },
  {
    q: "Are the Urdu captions right-to-left aware?",
    a: "Yes. ClipsHQ handles right-to-left scripts natively, so Urdu text flows correctly right-to-left, punctuation sits in the right place, and word-by-word highlighting tracks the spoken word in the correct direction.",
  },
  {
    q: "Can I edit the Urdu subtitles after generating them?",
    a: "Yes. Every caption is editable - fix a word, adjust timing, or change the style, color and position. Text edits apply instantly without a re-render.",
  },
  {
    q: "Is the Urdu subtitle generator free?",
    a: "You can start free with no credit card. The free plan includes automatic captions and AI clipping within a monthly minute allowance; paid plans add more minutes, no watermark, and faster processing.",
  },
  {
    q: "Can it turn a long Urdu video into clips?",
    a: "Yes. Feed in a long Urdu podcast, drama or interview and ClipsHQ finds the best moments, reframes them to vertical 9:16, and captions them in Urdu - ready for Shorts, Reels and TikTok.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Urdu captions - RTL aware
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Urdu Subtitle Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Generate accurate, right-to-left Urdu subtitles for any video - automatically.
          ClipsHQ transcribes the speech, times every word, and renders clean Urdu captions
          ready to post, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Urdu is written right-to-left in a flowing, cursive script, and that is precisely
          where English-first caption tools fall apart - text reverses, letters lose their
          joins, and the on-screen highlight runs backwards. ClipsHQ was built to handle
          <strong className="text-white"> right-to-left scripts</strong> properly, so your
          Urdu captions read naturally, in the correct direction, and look professionally
          set.
        </p>
        <p className="mt-4 text-base leading-7">
          For Urdu creators across Pakistan, India and a large global diaspora, captions are
          what capture the muted, autoplaying feed. Accurate on-screen Urdu is the
          difference between a viewer stopping to watch and a viewer scrolling on - and
          ClipsHQ makes it automatic.
        </p>
      </section>

      <FeatureBlock
        title="Automatic Urdu transcription and timing"
        bullets={[
          "Speech-to-text for spoken Urdu, including natural, conversational delivery.",
          "Word-level timestamps so captions land on the spoken word.",
          "Works on full videos or individual short clips.",
        ]}
      >
        <p>
          Paste a link or upload a file and ClipsHQ transcribes the audio, aligns each word
          to the timeline, and produces subtitles that stay in sync throughout - no manual
          timing, no line-by-line typing.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="True right-to-left rendering"
        bullets={[
          "RTL text flow with correct letter joining and punctuation.",
          "Word-by-word karaoke highlighting that runs in the right direction.",
          "Caption styles that look native to Urdu, not bolted on.",
        ]}
      >
        <p>
          Right-to-left rendering is not a checkbox - it has to run through the whole
          caption engine. ClipsHQ does exactly that, so your Urdu captions come out clean
          rather than mangled, every time.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="From long video to captioned shorts"
        bullets={[
          "AI clip detection surfaces the most engaging moments automatically.",
          "9:16 auto-reframe keeps the speaker centered for vertical feeds.",
          "One-click download, ready for Shorts, Reels and TikTok.",
        ]}
      >
        <p>
          The Urdu subtitle generator is part of a full clip pipeline. Feed in a long Urdu
          video and ClipsHQ finds the best moments, reframes them vertically, and captions
          them in Urdu - a batch of ready-to-post clips from one upload.
        </p>
      </FeatureBlock>

      <FeatureBlock title="Edit anything, instantly">
        <p>
          Every caption is editable - correct a word, adjust the timing, or change the
          style, color and position. Text edits apply instantly with no re-render, so
          polishing a clip is a matter of seconds.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Create Urdu-captioned shorts in minutes"
        sub="Start free - paste a link or upload a video and get accurate RTL Urdu captions automatically."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
