"use client";

import type { HookLayer, SubtitleLayer, SubtitleSegment } from "@/lib/types";

/**
 * The two INDEPENDENT live overlays rendered over the playing <video>:
 *   1) HOOK — the white-marker banner box (white text on a dark box by default).
 *   2) SUBTITLE — per-word karaoke: only the active segment's words render; the
 *      active word (last word whose start <= currentRel) pops in the highlight
 *      color. An overridden segment renders its override text as one block,
 *      highlighted whole while the segment is active (per-word timing no longer
 *      maps cleanly after a manual edit).
 *
 * Both update on every timeupdate and keystroke with zero network because
 * `currentRel` + the layer props are React state owned by the editor.
 */

const POSITION_CLASS: Record<"top" | "center" | "bottom", string> = {
  top: "top-6",
  center: "top-1/2 -translate-y-1/2",
  bottom: "bottom-8",
};

export interface CaptionOverlaysProps {
  hook: HookLayer;
  subtitle: SubtitleLayer;
  currentRel: number;
}

/** Active segment = the one whose [startRel, endRel] contains currentRel. */
function activeSegment(
  segments: SubtitleSegment[],
  t: number,
): SubtitleSegment | null {
  let candidate: SubtitleSegment | null = null;
  for (const s of segments) {
    if (t >= s.startRel && t <= s.endRel) return s;
    // Fallback: keep the last segment that has already started, so a gap
    // between segments still shows the most recent line rather than blanking.
    if (s.startRel <= t) candidate = s;
  }
  return candidate;
}

export function CaptionOverlays({
  hook,
  subtitle,
  currentRel,
}: CaptionOverlaysProps) {
  const seg = subtitle.show ? activeSegment(subtitle.segments, currentRel) : null;

  // Active word index = last word whose start <= currentRel within the segment.
  // When the segment is active but the playhead is before its first word's start
  // (e.g. the paused first frame), highlight the FIRST word so karaoke reads as
  // working immediately instead of showing an all-white segment.
  let activeWordIdx = -1;
  if (seg && !seg.textOverride && seg.words.length > 0) {
    activeWordIdx = 0;
    for (let i = 0; i < seg.words.length; i += 1) {
      if (seg.words[i]!.start <= currentRel) activeWordIdx = i;
      else break;
    }
  }

  const subFontStyle = subtitle.fontSize
    ? { fontSize: `${Math.round(subtitle.fontSize / 6)}px` }
    : undefined;
  const hookFontStyle = hook.fontSize
    ? { fontSize: `${Math.round(hook.fontSize / 6)}px` }
    : undefined;

  return (
    <>
      {/* HOOK overlay */}
      {hook.show && hook.text.trim().length > 0 && (
        <div
          className={`pointer-events-none absolute inset-x-3 z-10 flex justify-center ${POSITION_CLASS[hook.position]}`}
        >
          <span
            dir="auto"
            style={{
              color: hook.color,
              background: hook.boxColor,
              ...hookFontStyle,
            }}
            className="inline-block max-w-[88%] whitespace-pre-wrap break-words rounded px-2 py-1 text-center text-sm font-extrabold leading-relaxed"
          >
            {hook.text}
          </span>
        </div>
      )}

      {/* SUBTITLE overlay (karaoke) */}
      {subtitle.show && seg && (
        <div
          className={`pointer-events-none absolute inset-x-3 z-10 flex justify-center ${POSITION_CLASS[subtitle.position]}`}
        >
          <span
            dir="auto"
            style={subFontStyle}
            className="inline-block max-w-[88%] whitespace-pre-wrap break-words rounded bg-black/70 px-2 py-1 text-center text-sm font-extrabold leading-relaxed"
          >
            {seg.textOverride ? (
              // Overridden: per-word timing is gone; highlight the whole line
              // while the segment is active.
              <span style={{ color: subtitle.highlightColor }}>
                {seg.textOverride}
              </span>
            ) : (
              seg.words.map((w, i) => (
                <span
                  key={`${seg.id}-${i}`}
                  style={{
                    color: i === activeWordIdx ? subtitle.highlightColor : "#ffffff",
                  }}
                >
                  {w.word}
                  {i < seg.words.length - 1 ? " " : ""}
                </span>
              ))
            )}
          </span>
        </div>
      )}
    </>
  );
}
