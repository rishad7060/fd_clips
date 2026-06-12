import type { ClipStyle } from "./types";

/**
 * Caption style templates for the editor's style/template picker (10c).
 * `style` matches the CONTRACTS §1 style object that flows to the worker.
 */
export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  style: ClipStyle;
  /** Tailwind classes for the editor preview chip. */
  previewClass: string;
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "hormozi",
    name: "Hype (Bold)",
    description: "Big bold UPPERCASE words, 1–3 at a time, yellow active-word pop. The viral default.",
    style: { template: "hormozi", font: "Arial", highlight_color: "#FFE600", alignment: "center" },
    previewClass: "bg-black text-white uppercase font-extrabold",
  },
  {
    id: "default",
    name: "Clean Karaoke",
    description: "Sentence-case, ~5 words per line, white text + colored sweep. Less shouty.",
    style: { template: "default", font: "Arial", highlight_color: "#FFE600", alignment: "center" },
    previewClass: "bg-black text-white font-bold",
  },
  {
    id: "neon",
    name: "Neon Pulse",
    description: "Bold uppercase with a purple glow highlight. For product / tech content.",
    style: { template: "neon", font: "Arial", highlight_color: "#a855f7", alignment: "center" },
    previewClass: "bg-[#0b0f1a] text-white uppercase font-extrabold",
  },
  {
    id: "minimal",
    name: "Clean Minimal",
    description: "Lowercase, thin, bottom-placed, no shout. For talking-head explainers.",
    style: { template: "minimal", font: "Arial", highlight_color: "#ffffff", alignment: "bottom" },
    previewClass: "bg-neutral-900 text-neutral-100",
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

export const DEFAULT_STYLE: ClipStyle = STYLE_TEMPLATES[0]!.style;

export function templateById(id: string): StyleTemplate {
  return STYLE_TEMPLATES.find((t) => t.id === id) ?? STYLE_TEMPLATES[0]!;
}
