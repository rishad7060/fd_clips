"use client";

import type { SubtitleSegment } from "@/lib/types";
import { formatTimecode } from "@/lib/format";

/**
 * Karaoke segment timeline: one row per subtitle segment with its clip-relative
 * time range + an editable text input. The segment containing the current
 * playhead (`activeId`) gets a highlighted border so the user sees karaoke
 * progress in the list too. Dumb: parent owns state.
 */
export interface SubtitleTimelineProps {
  segments: SubtitleSegment[];
  activeId: string | null;
  onEditSegment: (id: string, text: string) => void;
}

function segmentText(seg: SubtitleSegment): string {
  return seg.textOverride ?? seg.words.map((w) => w.word).join(" ").trim();
}

export function SubtitleTimeline({
  segments,
  activeId,
  onEditSegment,
}: SubtitleTimelineProps) {
  if (!segments.length) {
    return (
      <p className="text-xs text-ink-500">
        No transcript words for this clip - edit the single subtitle line in the
        preview, or use the Hook layer.
      </p>
    );
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {segments.map((seg) => {
        const active = seg.id === activeId;
        return (
          <li
            key={seg.id}
            className={`rounded-lg border p-2 transition ${
              active
                ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                : "border-ink-700 bg-ink-850"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-500">
                {formatTimecode(seg.startRel)} → {formatTimecode(seg.endRel)}
              </span>
              {active && (
                <span className="rounded bg-brand/20 px-1.5 text-[10px] font-semibold text-brand-400">
                  ● live
                </span>
              )}
            </div>
            <input
              type="text"
              dir="auto"
              value={segmentText(seg)}
              onChange={(e) => onEditSegment(seg.id, e.target.value)}
              aria-label={`Subtitle segment at ${formatTimecode(seg.startRel)}`}
              className="w-full rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </li>
        );
      })}
    </ul>
  );
}
