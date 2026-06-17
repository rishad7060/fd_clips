"use client";

import { useRef } from "react";
import { STYLE_TEMPLATES, ALIGNMENT_OPTIONS } from "@/lib/templates";
import type { ClipStyle } from "@/lib/types";
import { SectionTitle } from "@/components/ui/Card";
import { CaptionSwatch } from "./CaptionSwatch";

/**
 * Opus-style caption "Quick presets": a horizontally-scrollable strip of tiles,
 * each showing a LIVE styled preview of the caption (the sample words rendered
 * in that preset's look) — plus a leading "No caption" option, "New" badges, and
 * chevron scroll arrows. Below it, a placement (top/center/bottom) row. Drives
 * the per-job caption style.
 */
interface Props {
  templateId: string;
  setTemplateId: (id: string) => void;
  alignment: NonNullable<ClipStyle["alignment"]>;
  setAlignment: (a: NonNullable<ClipStyle["alignment"]>) => void;
}

export function CaptionPresets({ templateId, setTemplateId, alignment, setAlignment }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNoCaption = STYLE_TEMPLATES.find((t) => t.id === templateId)?.noCaption;

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Caption preset</SectionTitle>
        <div className="flex items-center gap-1.5">
          <ArrowBtn dir="left" onClick={() => scrollBy(-1)} />
          <ArrowBtn dir="right" onClick={() => scrollBy(1)} />
        </div>
      </div>

      {/* Scrollable preset strip. */}
      <div
        ref={scrollRef}
        className="flex snap-x gap-2.5 overflow-x-auto scroll-px-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {STYLE_TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTemplateId(t.id)}
              title={t.description}
              className={`group relative flex w-[120px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition duration-200 ease-premium ${
                active
                  ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                  : "border-white/10 bg-ink-850 hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
              }`}
            >
              {t.isNew && (
                <span className="absolute -right-1.5 -top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-glow">
                  New
                </span>
              )}
              {/* Live caption swatch (the actual style preview). */}
              <span className={`grid h-[58px] w-full place-items-center overflow-hidden rounded-lg ${t.preview.bg}`}>
                <CaptionSwatch spec={t.preview} noCaption={t.noCaption} />
              </span>
              <span className={`text-[11px] font-medium ${active ? "text-white" : "text-ink-200"}`}>
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

function ArrowBtn({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Scroll presets left" : "Scroll presets right"}
      className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-ink-850 text-ink-300 transition hover:border-white/20 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}
