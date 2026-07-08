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
  icon:
    | "captions"
    | "download"
    | "hash"
    | "tags"
    | "type"
    | "fileText"
    | "zap"
    | "listOrdered"
    | "fileCode"
    | "keywords"
    | "scrollText"
    | "alignLeft";
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
  {
    slug: "youtube-title-generator",
    label: "Title Generator",
    title: "YouTube Video Title Generator",
    blurb:
      "Turn a topic into 10-15 catchy, clickable YouTube title variations - how-to, listicle, question and curiosity-gap styles.",
    icon: "type",
    keyword: "youtube title generator",
  },
  {
    slug: "youtube-description-generator",
    label: "Description Generator",
    title: "YouTube Description Generator",
    blurb:
      "Generate a formatted YouTube description with a hook, summary, timestamps, CTA, hashtags and links in one click.",
    icon: "fileText",
    keyword: "youtube description generator",
  },
  {
    slug: "youtube-hook-generator",
    label: "Hook Generator",
    title: "Video Hook Generator",
    blurb:
      "Get 10 scroll-stopping opening-line hooks for your video - curiosity, bold-claim, question and stat patterns.",
    icon: "zap",
    keyword: "video hook generator",
  },
  {
    slug: "youtube-timestamp-generator",
    label: "Timestamp Generator",
    title: "YouTube Timestamp & Chapter Generator",
    blurb:
      "Paste your chapter list and get valid, ordered YouTube timestamps that unlock clickable video chapters.",
    icon: "listOrdered",
    keyword: "youtube timestamp generator",
  },
  {
    slug: "srt-to-vtt-converter",
    label: "SRT to VTT Converter",
    title: "SRT to VTT Converter",
    blurb:
      "Convert subtitle files between SRT and VTT formats instantly - paste or upload, then download. No API.",
    icon: "fileCode",
    keyword: "srt to vtt converter",
  },
  {
    slug: "youtube-keyword-generator",
    label: "Keyword Generator",
    title: "YouTube Keyword Generator",
    blurb:
      "Expand any topic into dozens of related YouTube keyword and tag ideas - modifiers, long-tail and niche combos.",
    icon: "keywords",
    keyword: "youtube keyword generator",
  },
  {
    slug: "show-notes-generator",
    label: "Show Notes Generator",
    title: "Podcast Show Notes Generator",
    blurb:
      "Paste your episode summary or transcript and format clean show notes - title, summary, key points and links.",
    icon: "scrollText",
    keyword: "podcast show notes generator",
  },
  {
    slug: "caption-formatter",
    label: "Caption Formatter",
    title: "Caption & Subtitle Formatter",
    blurb:
      "Clean up messy captions - wrap lines to a readable length, fix sentence case and strip filler words.",
    icon: "alignLeft",
    keyword: "caption formatter",
  },
];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolPath(slug: string): string {
  return `/tools/${slug}`;
}
