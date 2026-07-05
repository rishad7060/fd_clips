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
};

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  const variant = VARIANTS[params.slug] ?? VARIANTS["default.png"];
  return renderOgImage(variant);
}
