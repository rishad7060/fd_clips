/**
 * Single source of truth for the free-tool suite (organic-SEO surfaces).
 * Consumed by the /tools hub, the sitemap, the navbar, and each tool's
 * cross-links, so a new tool is added in exactly one place.
 *
 * Strategy: mirror opus.pro, whose free tools (esp. /tools/youtube-video-
 * transcript) drive ~17% of their organic traffic. Each tool targets a
 * high-volume, creator-intent keyword and funnels users to the paid clip app.
 */
export interface ToolDef {
  slug: string;
  /** Nav/hub short label. */
  label: string;
  /** H1 / card title. */
  title: string;
  /** One-line hub-card + meta description lead. */
  blurb: string;
  /** lucide-react icon name (resolved in the hub to keep this file dep-free). */
  icon: "captions" | "download" | "hash" | "tags";
  /** Primary keyword this tool targets (for copy + internal anchors). */
  keyword: string;
}

export const TOOLS: ToolDef[] = [
  {
    slug: "youtube-to-transcript",
    label: "YouTube to Transcript",
    title: "YouTube to Transcript",
    blurb:
      "Get the full transcript of any YouTube video. Copy or download as TXT or SRT, with timestamps.",
    icon: "captions",
    keyword: "youtube transcript",
  },
  {
    slug: "youtube-subtitle-downloader",
    label: "Subtitle Downloader",
    title: "YouTube Subtitle Downloader",
    blurb:
      "Download a YouTube video's captions as a ready-to-use SRT or VTT subtitle file.",
    icon: "download",
    keyword: "download youtube subtitles",
  },
  {
    slug: "youtube-hashtag-generator",
    label: "Hashtag Generator",
    title: "YouTube Hashtag Generator",
    blurb:
      "Turn a topic or title into a ranked set of relevant YouTube hashtags you can copy in one click.",
    icon: "hash",
    keyword: "youtube hashtag generator",
  },
  {
    slug: "youtube-tags-extractor",
    label: "Tags Extractor",
    title: "YouTube Tags Extractor",
    blurb:
      "See the hidden tags and keywords any public YouTube video uses for its SEO.",
    icon: "tags",
    keyword: "youtube tags",
  },
];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolPath(slug: string): string {
  return `/tools/${slug}`;
}
