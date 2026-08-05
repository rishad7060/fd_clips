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

const SLUG = "tamil-subtitle-generator";
const KEYWORD = "Tamil Subtitle Generator";
const TITLE = "Tamil Subtitle Generator - Auto Tamil Captions for Video";
const DESCRIPTION =
  "Generate accurate Tamil subtitles and word-by-word captions automatically. ClipsHQ transcribes, times and renders Tamil captions for shorts, reels and long-form video - free to start.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/${SLUG}`,
  keywords: [
    "tamil subtitle generator",
    "tamil caption generator",
    "tamil subtitles",
    "auto tamil captions",
    "add tamil subtitles to video",
    "tamil video captions ai",
    "tamil srt generator",
  ],
});

const FAQS = [
  {
    q: "How do I generate Tamil subtitles for a video?",
    a: "Paste a video link or upload a file, and ClipsHQ automatically transcribes the Tamil speech, times each word, and renders subtitles. You can caption a whole video or individual clips, then edit, download or burn them in.",
  },
  {
    q: "Does it render the Tamil script correctly?",
    a: "Yes. Tamil is a complex script with combined characters, and ClipsHQ renders it cleanly so vowel signs and conjuncts display correctly on-screen - not as broken boxes or split glyphs.",
  },
  {
    q: "Can I get word-by-word highlighting in Tamil?",
    a: "Yes. ClipsHQ supports karaoke-style word highlighting where each word lights up as it is spoken - a proven format for boosting watch time on shorts and reels.",
  },
  {
    q: "Is the Tamil subtitle generator free?",
    a: "You can start free with no credit card. The free plan includes automatic captions and AI clipping within a monthly minute allowance; paid plans add more minutes, no watermark, and faster processing.",
  },
  {
    q: "Can it turn a long Tamil video into short clips?",
    a: "Yes. Drop in a long interview, podcast or lecture and ClipsHQ finds the best moments, reframes them to vertical 9:16, and captions them in Tamil - ready to post to Shorts, Reels and TikTok.",
  },
];

export default function Page() {
  return (
    <div>
      <SeoSchema slug={SLUG} name={KEYWORD} description={DESCRIPTION} faqs={FAQS} />
      <Breadcrumbs name={KEYWORD} />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Tamil captions - clean script rendering
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Tamil Subtitle Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Generate accurate Tamil subtitles for any video - automatically. ClipsHQ
          transcribes the speech, times every word, and renders clean Tamil captions ready
          to post, in minutes.
        </p>
        <div className="mt-7">
          <LanguageChips />
        </div>
      </section>

      <SeoProofBand />

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Tamil is one of the world&apos;s oldest living languages and one of its most
          complex to typeset. Vowel signs attach to consonants, characters combine, and a
          caption engine that was only ever tested on English will happily mangle all of
          it. ClipsHQ renders Tamil <strong className="text-white">cleanly and
          correctly</strong>, so your captions look like they were set by a person, not
          spat out by a machine.
        </p>
        <p className="mt-4 text-base leading-7">
          For Tamil creators the audience is huge and hungry - across Tamil Nadu, Sri
          Lanka, Singapore, Malaysia and a global diaspora - but feeds autoplay on mute.
          On-screen captions are how you win those first three seconds. ClipsHQ makes
          accurate Tamil captions the default, not a manual chore.
        </p>
      </section>

      <FeatureBlock
        title="Automatic Tamil transcription and timing"
        bullets={[
          "Speech-to-text for spoken Tamil, including natural, fast delivery.",
          "Word-level timestamps so captions land on the spoken word.",
          "Works on full videos or individual short clips.",
        ]}
      >
        <p>
          Paste a link or upload a file and ClipsHQ transcribes the audio, aligns each word
          to the timeline, and produces subtitles that stay in sync from start to finish -
          no manual timing, no line-by-line typing.
        </p>
      </FeatureBlock>

      <FeatureBlock
        title="Correct complex-script rendering"
        bullets={[
          "Combined characters and vowel signs render without breaking.",
          "Word-by-word karaoke highlighting for higher watch time.",
          "Caption styles that look native to Tamil, not retrofitted.",
        ]}
      >
        <p>
          Getting Tamil to display correctly on burned-in captions is a real engineering
          problem, and it is exactly the kind of detail English-first tools skip. ClipsHQ
          handles the script properly so your finished clip looks professional.
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
          The Tamil subtitle generator is one part of a complete clip pipeline. Feed in a
          long Tamil podcast or interview and ClipsHQ will find the best moments, reframe
          them vertically, and caption them in Tamil - a batch of ready-to-post clips from
          a single upload.
        </p>
      </FeatureBlock>

      <FeatureBlock title="Edit anything, instantly">
        <p>
          Every caption is editable - fix a word, adjust the timing, or change the style,
          color and position. Text edits apply instantly with no re-render, so polishing a
          clip takes seconds, not minutes.
        </p>
      </FeatureBlock>

      <SeoCta
        heading="Create Tamil-captioned shorts in minutes"
        sub="Start free - paste a link or upload a video and get accurate Tamil captions automatically."
      />

      <SeoFaq faqs={FAQS} />
      <RelatedSeoPages currentSlug={SLUG} />
    </div>
  );
}
