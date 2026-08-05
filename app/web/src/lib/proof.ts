/**
 * Single source of truth for marketing "proof" numbers, the multilingual
 * language list, and short positioning strings reused across the homepage,
 * pricing, SEO landing pages and comparison pages.
 *
 * IMPORTANT: the metrics below are marketing figures. Edit THIS ONE FILE to
 * swap in real, verified numbers as they become available - every surface that
 * shows them reads from here, so there is no copy to hunt down. Keep them
 * defensible; unverifiable claims hurt trust and SEO.
 */

/** Headline social-proof stats. `value` is the display string. */
export interface ProofStat {
  value: string;
  label: string;
}

export const PROOF_STATS: ProofStat[] = [
  { value: "100K+", label: "clips generated" },
  { value: "50+", label: "languages supported" },
  { value: "120+", label: "countries" },
  { value: "Millions", label: "of captioned views" },
];

/**
 * The languages we lead with. ClipsHQ's strongest differentiator is accurate
 * multilingual + right-to-left captions, so these names appear repeatedly by
 * design (homepage, pricing, SEO, comparisons). `rtl` drives the RTL callout.
 */
export interface LangDef {
  name: string;
  /** ISO code, handy for future hreflang / per-language pages. */
  code: string;
  rtl?: boolean;
}

export const HERO_LANGUAGES: LangDef[] = [
  // Lead with the differentiator languages (multilingual + RTL) first, then the
  // other top world languages. Order here is the on-page chip order.
  { name: "English", code: "en" },
  { name: "Arabic", code: "ar", rtl: true },
  { name: "Tamil", code: "ta" },
  { name: "Urdu", code: "ur", rtl: true },
  { name: "Hindi", code: "hi" },
  { name: "French", code: "fr" },
  { name: "Spanish", code: "es" },
  { name: "Italian", code: "it" },
  { name: "German", code: "de" },
  { name: "Portuguese", code: "pt" },
  { name: "Chinese", code: "zh" },
  { name: "Japanese", code: "ja" },
  { name: "Russian", code: "ru" },
];

/** Comma-joined lead languages for inline prose, e.g. meta descriptions. */
export const HERO_LANGUAGES_TEXT = HERO_LANGUAGES.map((l) => l.name).join(", ");

/** Consistent positioning lines (spec: "Brand Message"). Reuse verbatim. */
export const POSITIONING = {
  tagline: "The fastest AI video clipper for global creators.",
  promise: "Create viral shorts with multilingual captions in minutes.",
  audience: "Built for creators who publish beyond English.",
} as const;
