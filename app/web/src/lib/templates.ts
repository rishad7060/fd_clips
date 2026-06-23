import type { ClipStyle } from "./types";

/**
 * Caption style templates for the editor's style/template picker (10c).
 * `style` matches the CONTRACTS §1 style object that flows to the worker.
 *
 * Each template carries a `preview` recipe used to render a small LIVE swatch
 * of the caption (Opus-style): the sample words shown in the tile, styled with
 * the exact base/highlight colours, weight, case, outline and (optional) box -
 * so the picker shows what the caption will actually look like, not just a name.
 * The `id` maps 1:1 onto a pipeline TEMPLATES entry (pipeline/captions.py) so
 * the rendered clip matches the swatch.
 */
export interface CaptionPreviewSpec {
  /** Base (un-highlighted) word colour. */
  text: string;
  /** Active/highlighted word colour. */
  highlight: string;
  uppercase: boolean;
  /** Tailwind font-weight class, e.g. "font-extrabold". */
  weight: string;
  /** Outline colour (text-stroke); omit for no stroke. */
  stroke?: string;
  /** Outline width in px (with `stroke`). */
  strokeWidth?: number;
  /** Translucent pill background behind the words (podcast/clean styles). */
  box?: string;
  /** Soft glow around the highlighted word (e.g. "0 0 10px"). */
  glow?: boolean;
  /** Tile background. */
  bg: string;
  /** Sample words to render in the swatch (default "To get started"). */
  sample?: string;
}

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  style: ClipStyle;
  /** Live caption swatch recipe for the picker tile. */
  preview: CaptionPreviewSpec;
  /** Show a "New" badge in the picker. */
  isNew?: boolean;
  /** The explicit "No caption" option renders no swatch text. */
  noCaption?: boolean;
}

const TILE_BG = "bg-ink-900";

export const STYLE_TEMPLATES: StyleTemplate[] = [
  // The leading "No caption" option (Opus parity) - clips render with no burned
  // subtitles. The pipeline reads template:"none" and skips caption events.
  {
    id: "none",
    name: "No caption",
    description: "Render clips with no burned-in subtitles.",
    style: { template: "none", font: "Arial", highlight_color: "#ffffff", alignment: "center" },
    preview: { text: "#6b7280", highlight: "#6b7280", uppercase: false, weight: "font-medium", bg: TILE_BG },
    noCaption: true,
  },
  {
    id: "hormozi",
    name: "Mozi",
    description: "Big bold UPPERCASE words, yellow active-word pop. The viral business/hook look.",
    style: { template: "hormozi", font: "Arial", highlight_color: "#F7C204", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#F7C204", uppercase: true, weight: "font-extrabold", stroke: "#000000", strokeWidth: 2, bg: TILE_BG },
  },
  {
    id: "beasty",
    name: "Beasty",
    description: "MrBeast-loud: heavy ALL-CAPS, thick black stroke, bright green keyword pop.",
    style: { template: "beasty", font: "Arial", highlight_color: "#02FB23", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#02FB23", uppercase: true, weight: "font-black", stroke: "#000000", strokeWidth: 2.5, bg: TILE_BG },
  },
  {
    id: "default",
    name: "Karaoke",
    description: "Sentence-case, ~5 words per line, white text + cyan sweep. Cleaner, music-style.",
    style: { template: "default", font: "Arial", highlight_color: "#00E0FF", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#00E0FF", uppercase: false, weight: "font-bold", stroke: "#000000", strokeWidth: 1.5, bg: TILE_BG },
  },
  {
    id: "neon",
    name: "Devin Glow",
    description: "Bold uppercase with a soft purple glow highlight. Aesthetic, premium creator.",
    style: { template: "neon", font: "Arial", highlight_color: "#9B6BFF", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#C7B0FF", uppercase: true, weight: "font-bold", glow: true, bg: TILE_BG },
  },
  {
    id: "ali",
    name: "Ali Clean",
    description: "Sentence-case, semibold, subtle green highlight. Calm educational talking-head.",
    style: { template: "ali", font: "Arial", highlight_color: "#22C55E", alignment: "bottom" },
    preview: { text: "#ffffff", highlight: "#22C55E", uppercase: false, weight: "font-semibold", stroke: "#000000", strokeWidth: 1, bg: TILE_BG },
  },
  {
    id: "podp",
    name: "Pod P",
    description: "Soft amber on a translucent black pill. Podcast / interview clips.",
    style: { template: "podp", font: "Arial", highlight_color: "#FFB020", alignment: "bottom" },
    preview: { text: "#ffffff", highlight: "#FFB020", uppercase: false, weight: "font-medium", box: "rgba(0,0,0,0.6)", bg: TILE_BG },
  },
  {
    id: "popline",
    name: "Popline",
    description: "Extrabold UPPERCASE with a hot-pink pop. Trendy, punchy social.",
    style: { template: "popline", font: "Arial", highlight_color: "#FF2D78", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#FF2D78", uppercase: true, weight: "font-extrabold", stroke: "#000000", strokeWidth: 2, bg: TILE_BG },
    isNew: true,
  },
  {
    id: "glitch",
    name: "Glitch Infinite",
    description: "Condensed caps with an RGB-split cyan/magenta glitch highlight. Gaming, edgy.",
    style: { template: "glitch", font: "Arial", highlight_color: "#00FFFF", alignment: "center" },
    preview: { text: "#ffffff", highlight: "#00FFFF", uppercase: true, weight: "font-bold", stroke: "#FF00FF", strokeWidth: 1.5, bg: TILE_BG },
    isNew: true,
  },
  {
    id: "deepdiver",
    name: "Deep Diver",
    description: "Cream text, teal reveal, no shout. Storytelling / documentary.",
    style: { template: "deepdiver", font: "Arial", highlight_color: "#14B8A6", alignment: "bottom" },
    preview: { text: "#F5F0E6", highlight: "#14B8A6", uppercase: false, weight: "font-normal", box: "rgba(0,0,0,0.35)", bg: TILE_BG },
  },
  {
    id: "minimal",
    name: "Simple",
    description: "Lowercase, thin, bottom-placed, no colour pop. Neutral, brand-safe, B2B.",
    style: { template: "minimal", font: "Arial", highlight_color: "#ffffff", alignment: "bottom" },
    preview: { text: "#ffffff", highlight: "#ffffff", uppercase: false, weight: "font-normal", stroke: "#000000", strokeWidth: 1, bg: TILE_BG },
  },
];

/** Caption position options the user can pick in the app. */
export const ALIGNMENT_OPTIONS: { id: "top" | "center" | "bottom"; name: string }[] = [
  { id: "top", name: "Top" },
  { id: "center", name: "Center" },
  { id: "bottom", name: "Bottom" },
];

/**
 * Caption font-size choices (px in the 1080x1920 ASS canvas). `value: 0` means
 * "use the template's own size". The pipeline auto-shrinks any line that would
 * still overflow, so even XL is safe.
 */
export const FONT_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: "Default", value: 0 },
  { label: "S", value: 72 },
  { label: "M", value: 96 },
  { label: "L", value: 120 },
  { label: "XL", value: 150 },
];

/** The default caption preset (NOT "none") - the viral Mozi/Hormozi look. */
export const DEFAULT_TEMPLATE_ID = "hormozi";

export function templateById(id: string): StyleTemplate {
  return (
    STYLE_TEMPLATES.find((t) => t.id === id) ??
    STYLE_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
  );
}

export const DEFAULT_STYLE: ClipStyle = templateById(DEFAULT_TEMPLATE_ID).style;
