import type { CSSProperties } from "react";
import type { CaptionPreviewSpec } from "@/lib/templates";

/**
 * A live mini-preview of a caption style (Opus-style). Renders the sample words
 * in the preset's exact look - base colour, an active/highlighted word, weight,
 * case, text-stroke, optional translucent pill box and glow - so a picker tile
 * shows what the burned-in caption will actually look like, not just a name.
 *
 * The middle word is treated as the "active" (spoken) word and gets the
 * highlight colour + glow, mimicking the per-word karaoke highlight.
 */
export function CaptionSwatch({
  spec,
  noCaption = false,
}: {
  spec: CaptionPreviewSpec;
  noCaption?: boolean;
}) {
  if (noCaption) {
    // The "No caption" tile: a struck-through circle, no text.
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full border border-ink-500 text-ink-400">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </span>
    );
  }

  const sample = spec.sample ?? "To get started";
  const words = sample.split(" ");
  // Highlight the middle word (the "active" one), like a karaoke sweep mid-line.
  const activeIdx = Math.min(words.length - 1, Math.floor(words.length / 2));

  // Thick outline can't be done with a single -webkit-text-stroke without eating
  // the glyph; layer a few text-shadows around it for a clean readable stroke.
  const strokeShadow = spec.stroke
    ? (() => {
        const w = spec.strokeWidth ?? 1.5;
        const c = spec.stroke;
        const o: string[] = [];
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++)
            if (dx || dy) o.push(`${dx * w}px ${dy * w}px 0 ${c}`);
        return o.join(", ");
      })()
    : "";

  const base: CSSProperties = {
    color: spec.text,
    textTransform: spec.uppercase ? "uppercase" : "none",
    textShadow: strokeShadow || undefined,
    lineHeight: 1.05,
  };

  const pill: CSSProperties | undefined = spec.box
    ? { background: spec.box, padding: "2px 6px", borderRadius: 6 }
    : undefined;

  return (
    <span
      className={`inline-flex flex-wrap items-center justify-center gap-x-1 text-center text-[13px] tracking-tight ${spec.weight}`}
      style={base}
    >
      <span style={pill} className="inline-flex flex-wrap items-center justify-center gap-x-1">
        {words.map((w, i) => {
          const active = i === activeIdx;
          const wStyle: CSSProperties = active
            ? {
                color: spec.highlight,
                textShadow: spec.glow
                  ? `0 0 8px ${spec.highlight}, 0 0 14px ${spec.highlight}${strokeShadow ? ", " + strokeShadow : ""}`
                  : strokeShadow || undefined,
              }
            : {};
          return (
            <span key={i} style={wStyle}>
              {w}
            </span>
          );
        })}
      </span>
    </span>
  );
}
