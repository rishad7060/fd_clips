"use client";

import { STYLE_TEMPLATES, ALIGNMENT_OPTIONS } from "@/lib/templates";
import type { ClipStyle } from "@/lib/types";
import { SectionTitle } from "@/components/ui/Card";
import { CaptionSwatch } from "./CaptionSwatch";

/**
 * Opus-style caption presets: a 2×6 GRID of tiles, each showing a LIVE styled
 * preview of the caption (the sample words rendered in that preset's look) —
 * with a leading "No caption" option and "New" badges. Below it, a placement
 * (top/center/bottom) row. Drives the per-job caption style.
 */
interface Props {
  templateId: string;
  setTemplateId: (id: string) => void;
  alignment: NonNullable<ClipStyle["alignment"]>;
  setAlignment: (a: NonNullable<ClipStyle["alignment"]>) => void;
}

export function CaptionPresets({ templateId, setTemplateId, alignment, setAlignment }: Props) {
  const isNoCaption = STYLE_TEMPLATES.find((t) => t.id === templateId)?.noCaption;

  return (
    <div>
      <SectionTitle className="mb-3">Caption preset</SectionTitle>

      {/* 2×6 grid (Opus-style): all presets visible at once, no horizontal scroll.
          Collapses to 3 / 2 columns on narrow widths. */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {STYLE_TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTemplateId(t.id)}
              title={t.description}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition duration-200 ease-premium ${
                active
                  ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                  : "border-white/10 bg-ink-850 hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
              }`}
            >
              {t.isNew && (
                <span className="absolute -right-1.5 -top-1.5 z-10 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-glow">
                  New
                </span>
              )}
              {/* Live caption swatch (the actual style preview). */}
              <span className={`grid h-[52px] w-full place-items-center overflow-hidden rounded-lg ${t.preview.bg}`}>
                <CaptionSwatch spec={t.preview} noCaption={t.noCaption} />
              </span>
              <span className={`truncate text-[11px] font-medium ${active ? "text-white" : "text-ink-200"}`}>
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Placement — hidden for "No caption" (nothing to place). */}
      {!isNoCaption && (
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
      )}
    </div>
  );
}
