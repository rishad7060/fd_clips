"use client";

import { STYLE_TEMPLATES, ALIGNMENT_OPTIONS } from "@/lib/templates";
import type { ClipStyle } from "@/lib/types";

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
      <h2 className="mb-3 text-sm font-bold text-white">Caption preset</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STYLE_TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              title={t.description}
              className={`flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition ${
                active ? "border-brand ring-2 ring-brand/40" : "border-ink-700 hover:border-ink-500"
              }`}
            >
              {/* Mini caption swatch */}
              <span className={`rounded px-2 py-0.5 text-[11px] leading-none ${t.previewClass}`}>
                Aa
              </span>
              <span className="text-[11px] font-medium text-white/70">{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Placement */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-ink-400">Placement:</span>
        {ALIGNMENT_OPTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAlignment(a.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              alignment === a.id ? "bg-brand text-ink-950" : "bg-ink-800 text-white/70 hover:text-white"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}
