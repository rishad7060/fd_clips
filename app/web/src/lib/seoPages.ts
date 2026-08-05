/**
 * Single source of truth for the keyword-targeted SEO landing pages (the
 * "money" pages that rank for high-intent searches like "best ai video clipper"
 * or "arabic subtitle generator"). Consumed by the sitemap, the SeoSchema
 * cross-link strip, and each page. Add a page here in ONE place and it appears
 * in the sitemap + internal links automatically.
 *
 * These live at the site ROOT (e.g. /best-ai-video-clipper) - the exact,
 * high-value slugs - via the (seo) route group, matching the spec's URL list.
 */
export interface SeoPageDef {
  slug: string;
  /** Primary target keyword (also the H1 lead / hub label). */
  keyword: string;
  /** Short hub-card + internal-link blurb. */
  blurb: string;
}

export const SEO_PAGES: SeoPageDef[] = [
  {
    slug: "opus-clip-alternative",
    keyword: "Opus Clip Alternative",
    blurb:
      "A cheaper, simpler Opus Clip alternative with no watermark and strong multilingual captions.",
  },
  {
    slug: "best-ai-video-clipper",
    keyword: "Best AI Video Clipper",
    blurb:
      "The fastest AI video clipper for global creators - viral shorts with accurate captions in minutes.",
  },
  {
    slug: "podcast-clip-generator",
    keyword: "Podcast Clip Generator",
    blurb:
      "Turn long podcast episodes into ranked, captioned clips automatically - no editing required.",
  },
  {
    slug: "ai-shorts-generator",
    keyword: "AI Shorts Generator",
    blurb:
      "Generate ready-to-post vertical shorts from any long video with AI clip detection and captions.",
  },
  {
    slug: "youtube-shorts-maker",
    keyword: "YouTube Shorts Maker",
    blurb:
      "Make YouTube Shorts from long videos in minutes - auto reframe, captions, and one-click download.",
  },
  {
    slug: "instagram-reel-generator",
    keyword: "Instagram Reel Generator",
    blurb:
      "Create Instagram Reels from long-form video with 9:16 reframing and accurate multilingual captions.",
  },
  {
    slug: "tiktok-clip-generator",
    keyword: "TikTok Clip Generator",
    blurb:
      "Cut viral TikTok clips from any video automatically, captioned and reframed for vertical.",
  },
  {
    slug: "arabic-subtitle-generator",
    keyword: "Arabic Subtitle Generator",
    blurb:
      "Accurate right-to-left Arabic subtitles and captions, generated automatically for any video.",
  },
  {
    slug: "tamil-subtitle-generator",
    keyword: "Tamil Subtitle Generator",
    blurb:
      "Automatic Tamil subtitles and word-by-word captions for shorts, reels and long-form video.",
  },
  {
    slug: "urdu-subtitle-generator",
    keyword: "Urdu Subtitle Generator",
    blurb:
      "Accurate right-to-left Urdu subtitles and captions, generated automatically in minutes.",
  },
];

export function seoPageBySlug(slug: string): SeoPageDef | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}
