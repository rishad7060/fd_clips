import { renderOgImage } from "@/lib/ogImage";

// Runtime-render (never prerender) so @vercel/og doesn't throw during static
// export. First hit renders; the CDN/browser caches thereafter.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Copy for each OG image, keyed by the requested file slug. */
const VARIANTS: Record<string, { title: string; subtitle?: string; eyebrow?: string }> = {
  "default.png": {
    eyebrow: "AI shorts generator",
    title: "One long video, 10 viral clips.",
    subtitle: "Ranked, captioned, vertical shorts - automatically.",
  },
  "tools.png": {
    eyebrow: "Free tools",
    title: "Free YouTube tools for creators",
    subtitle: "Transcripts, subtitles, hashtags & tags.",
  },
  "youtube-to-transcript.png": {
    title: "YouTube to Transcript",
    subtitle: "Get the full transcript of any YouTube video - free.",
  },
  "youtube-subtitle-downloader.png": {
    title: "YouTube Subtitle Downloader",
    subtitle: "Download captions as SRT or VTT - free.",
  },
  "youtube-hashtag-generator.png": {
    title: "YouTube Hashtag Generator",
    subtitle: "Ranked, relevant hashtags in one click - free.",
  },
  "youtube-tags-extractor.png": {
    title: "YouTube Tags Extractor",
    subtitle: "See any video's hidden tags - free.",
  },
  "youtube-title-generator.png": {
    title: "YouTube Title Generator",
    subtitle: "10-15 catchy, clickable title ideas - free.",
  },
  "youtube-description-generator.png": {
    title: "YouTube Description Generator",
    subtitle: "A formatted description with hook, CTA & hashtags - free.",
  },
  "youtube-hook-generator.png": {
    title: "Video Hook Generator",
    subtitle: "10 scroll-stopping opening hooks - free.",
  },
  "youtube-timestamp-generator.png": {
    title: "YouTube Timestamp Generator",
    subtitle: "Valid, ordered chapters for your video - free.",
  },
  "srt-to-vtt-converter.png": {
    title: "SRT to VTT Converter",
    subtitle: "Convert subtitles both ways in your browser - free.",
  },
  "youtube-keyword-generator.png": {
    title: "YouTube Keyword Generator",
    subtitle: "Dozens of related keyword & tag ideas - free.",
  },
  "show-notes-generator.png": {
    title: "Podcast Show Notes Generator",
    subtitle: "Clean, formatted show notes from your text - free.",
  },
  "caption-formatter.png": {
    title: "Caption & Subtitle Formatter",
    subtitle: "Clean up and wrap messy captions - free.",
  },
};

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  const variant = VARIANTS[params.slug] ?? VARIANTS["default.png"];
  return renderOgImage(variant);
}
