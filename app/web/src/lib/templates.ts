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
    id: "default",
    name: "Bold Yellow",
    description: "High-contrast karaoke pop. The FocalDive default.",
    style: { template: "default", font: "Inter", highlight_color: "#FFE600" },
    previewClass: "bg-black text-white",
  },
  {
    id: "hormozi",
    name: "Hype",
    description: "Chunky uppercase words with a punchy green highlight.",
    style: { template: "hormozi", font: "Montserrat", highlight_color: "#22d3ee" },
    previewClass: "bg-black text-white uppercase",
  },
  {
    id: "minimal",
    name: "Clean Minimal",
    description: "Lowercase, no shout. For talking-head explainers.",
    style: { template: "minimal", font: "Inter", highlight_color: "#ffffff" },
    previewClass: "bg-neutral-900 text-neutral-100",
  },
  {
    id: "neon",
    name: "Neon Pulse",
    description: "Purple glow highlight for product / tech content.",
    style: { template: "neon", font: "Poppins", highlight_color: "#a855f7" },
    previewClass: "bg-[#0b0f1a] text-white",
  },
];

export const DEFAULT_STYLE: ClipStyle = STYLE_TEMPLATES[0]!.style;

export function templateById(id: string): StyleTemplate {
  return STYLE_TEMPLATES.find((t) => t.id === id) ?? STYLE_TEMPLATES[0]!;
}
