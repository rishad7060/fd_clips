"use client";

import { STYLE_TEMPLATES, ALIGNMENT_OPTIONS } from "@/lib/templates";
import type { ClipStyle } from "@/lib/types";
import { SectionTitle } from "@/components/ui/Card";

/**
 * Opus-style caption "Quick presets": a grid of caption-style tiles plus a
 * placement (top/center/bottom) row. Drives the per-job caption style.
 */
interface Props {
  templateId: string;
  setTemplateId: (id: string) => void;
  alignment: NonNullable<ClipStyle["alignment"]>;
  setAlignment: (a: NonNullable<ClipStyle["alignment"]>) => void;
}

export function CaptionPresets({ templateId, setTemplateId, alignment, setAlignment }: Props) {
  return (
    <div>
      <SectionTitle className="mb-3">Caption preset</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STYLE_TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTemplateId(t.id)}
              title={t.description}
              className={`flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition duration-200 ease-premium ${
                active
                  ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                  : "border-white/10 bg-ink-850 hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
              }`}
            >
              {/* Mini caption swatch */}
              <span className={`rounded px-2 py-0.5 text-[11px] leading-none ${t.previewClass}`}>
                Aa
              </span>
              <span className="text-[11px] font-medium text-ink-200">{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Placement — unified selected affordance to match the editor's PositionPicker. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-ink-300">Placement:</span>
        {ALIGNMENT_OPTIONS.map((a) => {
          const active = alignment === a.id;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={active}
              onClick={() => setAlignment(a.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "border-brand bg-brand/10 text-white ring-1 ring-brand/40"
                  : "border-white/10 bg-ink-850 text-ink-200 hover:border-white/15 hover:text-white"
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
