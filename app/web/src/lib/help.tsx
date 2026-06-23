import type { ReactNode } from "react";

/**
 * Help-center content as a typed data array - no MDX tooling. Each article is a
 * slug + metadata + a `body` render function returning React, so we get full
 * control over styling (the design-system primitives) without a markdown layer.
 *
 * Facts here are kept in sync with the real product (verified against code):
 *  - 60 free source-minutes/mo  → app/api/src/billing/plans.ts (SINGLE SOURCE OF TRUTH)
 *  - 11 caption presets          → app/web/src/lib/templates.ts (STYLE_TEMPLATES)
 *  - Pricing: Starter $7.50/mo · Pro $14.50/mo (half of Opus) → plans.ts
 *  - Free tier: 1080p, watermark, clips expire after 3 days, editing gated → plans.ts
 */

export type HelpCategory =
  | "Getting started"
  | "Captions"
  | "Billing"
  | "Sources"
  | "Languages";

export interface HelpArticle {
  slug: string;
  title: string;
  /** One-line summary shown on the index card. */
  summary: string;
  category: HelpCategory;
  /** Estimated read time, minutes. */
  readMins: number;
  /** Rendered article body. Built via the `<P>/<H>/…` helpers for consistency. */
  body: () => ReactNode;
}

export const HELP_CATEGORIES: { name: HelpCategory; blurb: string; icon: string }[] = [
  { name: "Getting started", blurb: "Make your first clips in minutes.", icon: "M5 3v18l15-9z" },
  { name: "Captions", blurb: "Presets, placement, and editing.", icon: "M4 7h16M4 12h10M4 17h7" },
  { name: "Billing", blurb: "Credits, plans, and the free tier.", icon: "M3 10h18M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { name: "Sources", blurb: "Where you can pull video from.", icon: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" },
  { name: "Languages", blurb: "Speech languages and RTL captions.", icon: "M3 5h12M9 3v2c0 6-3 9-6 11M5 9c0 3 3 6 7 7M14 19l4-9 4 9M15.5 16h5" },
];

/** Opus's public docs - linked as authoritative "Learn more" references. */
export const OPUS_DOCS = "https://help.opus.pro/docs/article";

/* ── Prose primitives (on-brand, dark, ink/brand tokens) ─────────────────── */

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 mb-3 text-lg font-semibold tracking-tight text-white first:mt-0">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[15px] leading-7 text-ink-300">{children}</p>;
}
function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-4 space-y-2">{children}</ul>;
}
function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-7 text-ink-300">
      <svg viewBox="0 0 24 24" className="mt-2 h-3.5 w-3.5 shrink-0 text-brand-300" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mb-5 space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/15 font-mono text-xs font-semibold text-brand-300 ring-1 ring-brand/30">
            {i + 1}
          </span>
          <span className="text-[15px] leading-7 text-ink-300">{it}</span>
        </li>
      ))}
    </ol>
  );
}
function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>;
}
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-[14px] leading-6 text-ink-300">
      {children}
    </div>
  );
}
function OpusLink({ href = OPUS_DOCS, children }: { href?: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-brand-300 underline-offset-4 transition hover:text-brand-200 hover:underline"
    >
      {children ?? "Learn more on Opus"}
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started - create your first clips",
    summary: "Paste a link or upload a file, let the AI find the best moments, and download captioned vertical clips.",
    category: "Getting started",
    readMins: 3,
    body: () => (
      <>
        <P>
          Clips turns one long video - a podcast, interview, webinar, or stream - into a handful of
          ranked, captioned, vertical <B>9:16</B> short clips, ready to post. You bring the source; the AI finds
          the moments worth cutting and frames them around whoever is speaking.
        </P>

        <H>Make your first clips</H>
        <Steps
          items={[
            <>From the home dashboard, click <B>New clips</B> (the <B>+</B> in the left rail).</>,
            <>Paste a video URL (YouTube, TikTok, Instagram, X, Vimeo) or <B>upload a file</B> directly.</>,
            <>Pick your options: aspect ratio, clip length, number of moments, caption preset, and which part of the video to process.</>,
            <>Press <B>Get clips</B>. The job runs in the background - you can leave the page and come back.</>,
            <>When it finishes, your clips appear on the dashboard. Preview, edit captions, and download each one.</>,
          ]}
        />

        <H>What happens under the hood</H>
        <P>The pipeline runs the same stages a human editor would, automatically:</P>
        <UL>
          <LI><B>Transcribe</B> - word-level transcript with timestamps.</LI>
          <LI><B>Score</B> - an LLM ranks candidate moments against a virality rubric (hooks, payoff, self-contained story), blended with YouTube&apos;s &quot;most replayed&quot; heatmap when available.</LI>
          <LI><B>Cut</B> - clean cuts on sentence boundaries, so clips never start mid-thought.</LI>
          <LI><B>Reframe</B> - crops to vertical and follows the active speaker.</LI>
          <LI><B>Caption</B> - burns word-by-word karaoke captions in your chosen style.</LI>
        </UL>

        <Note>
          Most jobs finish in a few minutes. Longer sources take longer - processing time scales with the
          length of the video you submit (and how much of it you ask us to process).
        </Note>

        <H>Tips for great clips</H>
        <UL>
          <LI>Conversational, single-topic content (podcasts, talking-head) clips best.</LI>
          <LI>Use the <B>process range</B> control to skip long intros and only mine the good middle.</LI>
          <LI>Try a couple of caption presets - see <B>Caption presets &amp; styles</B>.</LI>
        </UL>
        <P>
          Want the deeper background on how AI clipping works? <OpusLink>Learn more on Opus</OpusLink>.
        </P>
      </>
    ),
  },

  {
    slug: "caption-presets-and-styles",
    title: "Caption presets & styles",
    summary: "The 11 caption presets, where to place them, and how to edit the words before you export.",
    category: "Captions",
    readMins: 4,
    body: () => (
      <>
        <P>
          Every clip ships with burned-in, word-by-word <B>karaoke captions</B> - each word lights up as it&apos;s
          spoken. You choose the look from <B>11 presets</B>, set the on-screen placement, and can edit the actual
          caption text before exporting.
        </P>

        <H>The 11 presets</H>
        <P>One of these is <B>No caption</B> (clips render clean, no subtitles). The other ten are styled looks:</P>
        <UL>
          <LI><B>No caption</B> - render clips with no burned-in subtitles.</LI>
          <LI><B>Mozi</B> - big bold UPPERCASE, yellow active-word pop. The viral business/hook look (the default).</LI>
          <LI><B>Beasty</B> - heavy ALL-CAPS, thick black stroke, bright green keyword pop.</LI>
          <LI><B>Karaoke</B> - sentence-case, ~5 words per line, white text with a cyan sweep.</LI>
          <LI><B>Devin Glow</B> - bold uppercase with a soft purple glow. Aesthetic, premium.</LI>
          <LI><B>Ali Clean</B> - sentence-case, semibold, subtle green highlight. Calm, educational.</LI>
          <LI><B>Pod P</B> - soft amber on a translucent black pill. Podcast / interview clips.</LI>
          <LI><B>Popline</B> - extrabold UPPERCASE with a hot-pink pop. Trendy, punchy social.</LI>
          <LI><B>Glitch Infinite</B> - condensed caps with an RGB-split cyan/magenta highlight. Gaming, edgy.</LI>
          <LI><B>Deep Diver</B> - cream text, teal reveal, no shout. Storytelling / documentary.</LI>
          <LI><B>Simple</B> - lowercase, thin, bottom-placed, no colour pop. Neutral, brand-safe, B2B.</LI>
        </UL>

        <H>Placement &amp; size</H>
        <P>
          Independently of the preset, set caption <B>placement</B> - <B>Top</B>, <B>Center</B>, or <B>Bottom</B> -
          and a <B>font size</B> (Default, S, M, L, XL). Lines that would overflow are auto-shrunk to fit the
          1080×1920 frame, so even XL stays safe.
        </P>

        <H>Editing the caption text</H>
        <P>
          The transcript is good, but not perfect - names, brands, and slang sometimes need a touch-up. Open a
          finished clip and use the inline editor to fix the wording, reposition captions, change the highlight
          colour, or trim the clip. On paid plans these edits apply instantly, without a re-render.
        </P>
        <Note>
          Caption editing is a paid-plan feature. On the free tier you still pick a preset and placement up front,
          but the in-app editor is locked - upgrade to Starter or Pro to edit after the fact.
        </Note>
        <P>
          For more on Opus-style captions and best practices, <OpusLink>Learn more on Opus</OpusLink>.
        </P>
      </>
    ),
  },

  {
    slug: "credits-and-billing",
    title: "Credits & billing",
    summary: "How credits work (1 credit ≈ 1 source-minute), what spends them, and how your monthly grant resets.",
    category: "Billing",
    readMins: 3,
    body: () => (
      <>
        <H>How credits work</H>
        <P>
          Credits are <B>source-minutes</B>: roughly <B>1 credit = 1 minute</B> of the video you submit. A 12-minute
          podcast costs about 12 credits to process, no matter how many clips come out the other side. You&apos;re
          billed for the input you feed in, not the clips you get back.
        </P>

        <H>What uses credits</H>
        <UL>
          <LI><B>Submitting a job</B> - credits are reserved/spent based on the length of the source (and the slice you choose with the process-range control).</LI>
          <LI>Generating more clips from the <B>same</B> source again is a fresh job and spends credits again.</LI>
        </UL>
        <P>
          Previewing, downloading, and (on paid plans) the instant inline edits do <B>not</B> cost credits - only
          processing video does.
        </P>

        <H>Your monthly grant</H>
        <P>
          Each plan comes with a monthly credit allowance that resets on renewal: <B>Free 60</B>, <B>Starter 150</B>,
          and <B>Pro 300</B> source-minutes per month. You can always see your remaining balance in the credits chip
          at the top of the app and on the <B>Plans &amp; credits</B> page.
        </P>
        <Note>
          Running low? You can upgrade at any time, or buy a one-time credit pack - both top up the same balance.
          See <B>Free trial &amp; plans</B> for what each tier includes.
        </Note>
      </>
    ),
  },

  {
    slug: "free-trial-and-plans",
    title: "Free trial & plans",
    summary: "Free forever (60 credits, 1080p, watermark, 3-day clips), plus Starter and Pro - half of Opus's price.",
    category: "Billing",
    readMins: 3,
    body: () => (
      <>
        <H>Free, forever</H>
        <P>
          There&apos;s no time-limited trial to expire - the <B>Free</B> plan is free forever. You get <B>60
          source-minutes per month</B> to make real clips. The catch is a few limits, mirrored from Opus&apos;s
          free tier:
        </P>
        <UL>
          <LI><B>1080p</B> output (same resolution as paid).</LI>
          <LI>A <B>watermark</B> burned into clips.</LI>
          <LI>Clips <B>expire after 3 days</B> - download what you want to keep.</LI>
          <LI><B>No in-app editing</B> - the post-export caption/trim editor is locked.</LI>
        </UL>

        <H>Paid plans</H>
        <P>Both paid tiers lift the watermark, keep your clips indefinitely, and unlock the editor:</P>
        <UL>
          <LI><B>Starter - $7.50/mo</B> · 150 source-minutes/mo · 1080p, no watermark · clips kept · editing on · priority queue.</LI>
          <LI><B>Pro - $14.50/mo</B> · 300 source-minutes/mo · everything in Starter · active-speaker reframe · clips kept.</LI>
        </UL>
        <Note>
          Pricing is deliberately set at <B>half of Opus Clip&apos;s</B> for the same monthly minutes
          (Opus Starter $15, Pro $29). Checkout is handled by Polar.sh - recurring monthly
          subscriptions, with cards and more supported (no account required).
        </Note>
        <P>
          You can upgrade, downgrade, or cancel anytime from the <B>Plans &amp; credits</B> page. Compare with
          Opus&apos;s plans - <OpusLink>Learn more on Opus</OpusLink>.
        </P>
      </>
    ),
  },

  {
    slug: "supported-sources",
    title: "Supported sources",
    summary: "YouTube, TikTok, Instagram, X, Vimeo, and direct file upload - plus what to do when a link fails.",
    category: "Sources",
    readMins: 3,
    body: () => (
      <>
        <H>Where you can pull video from</H>
        <P>Paste a public link from any of these, or skip links entirely and upload a file:</P>
        <UL>
          <LI><B>YouTube</B> - videos and (long-form) shorts.</LI>
          <LI><B>TikTok</B></LI>
          <LI><B>Instagram</B> - Reels and video posts.</LI>
          <LI><B>X (Twitter)</B> - video posts.</LI>
          <LI><B>Vimeo</B></LI>
          <LI><B>Direct file upload</B> - your own MP4 / MOV, no link required.</LI>
        </UL>
        <P>
          For URLs, we fetch the best available quality up to <B>1080p</B>. Uploading a file is the most reliable
          path when a source is private, region-locked, or otherwise gated.
        </P>

        <H>When a link fails</H>
        <P>Most link failures fall into one of these buckets:</P>
        <UL>
          <LI><B>Private / unlisted / members-only</B> - we can only fetch public videos. Make it public, or upload the file.</LI>
          <LI><B>403 / &quot;sign in to confirm&quot; / bot check</B> - the platform blocked the download. Try a different link, wait and retry, or upload the file directly.</LI>
          <LI><B>Age- or region-restricted</B> - gated content often can&apos;t be fetched; upload the file instead.</LI>
          <LI><B>Live or still-processing</B> - wait until the VOD is fully published, then submit the link.</LI>
        </UL>
        <Note>
          When in doubt, <B>download the video yourself and upload the file</B>. It sidesteps every link-side
          restriction and always works.
        </Note>
      </>
    ),
  },

  {
    slug: "speech-languages-and-rtl-captions",
    title: "Speech languages & RTL captions",
    summary: "20+ spoken languages auto-detected, with full right-to-left caption support for Arabic and Urdu.",
    category: "Languages",
    readMins: 2,
    body: () => (
      <>
        <H>Languages we understand</H>
        <P>
          Transcription auto-detects the spoken language - there&apos;s nothing to set. We support <B>20+ languages</B>,
          including English, Spanish, Portuguese, French, German, Italian, Dutch, Hindi, <B>Arabic</B>, <B>Urdu</B>,
          Turkish, Russian, Japanese, Korean, Chinese, and more. Captions are generated in the same language that&apos;s
          spoken.
        </P>

        <H>Right-to-left (RTL) captions</H>
        <P>
          Karaoke captions are fully <B>RTL-capable</B>. For <B>Arabic</B> and <B>Urdu</B>, words render and highlight
          right-to-left with correct letter shaping and joining, so captions read naturally instead of looking
          reversed or broken. Every caption preset works in RTL.
        </P>
        <Note>
          Tip: if a source mixes languages (e.g. English with Arabic phrases), the dominant spoken language drives
          detection. For clean single-language captions, submit single-language sources.
        </Note>
      </>
    ),
  },
];

export function articleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function articlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}
