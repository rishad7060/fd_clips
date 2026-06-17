"use client";

import { useCallback, useRef } from "react";

/**
 * Opus-style processing-timeframe slider: a single track with TWO draggable
 * handles selecting the [start, end] window of the source to process, labelled
 * in m:ss. Replaces the manual From/To second inputs. Needs the real video
 * duration (from the preview metadata); the parent only renders this once known.
 */
export function TimelineRange({
  durationSec,
  range,
  setRange,
}: {
  durationSec: number;
  range: { start: number; end: number } | null;
  setRange: (v: { start: number; end: number } | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dur = Math.max(1, durationSec);
  // The active window: full video when range is null.
  const start = range ? Math.max(0, Math.min(range.start, dur)) : 0;
  const end = range ? Math.max(start + 1, Math.min(range.end, dur)) : dur;
  const isFull = start <= 0 && end >= dur;

  const pct = (s: number) => `${(s / dur) * 100}%`;

  const startDrag = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;
      const move = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const sec = Math.round(frac * dur);
        if (handle === "start") {
          setRange({ start: Math.min(sec, end - 1), end });
        } else {
          setRange({ start, end: Math.max(sec, start + 1) });
        }
      };
      const onMove = (ev: PointerEvent) => move(ev.clientX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [dur, start, end, setRange],
  );

  return (
    <div>
      {/* Track */}
      <div ref={trackRef} className="relative mt-1 h-9 select-none">
        {/* base rail */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-700" />
        {/* selected fill */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: pct(start), width: pct(end - start) }}
        />
        {/* handles */}
        <Handle posLeft={pct(start)} onPointerDown={startDrag("start")} label="Start" />
        <Handle posLeft={pct(end)} onPointerDown={startDrag("end")} label="End" />
      </div>

      {/* Time readouts (Opus-style m:ss pills) */}
      <div className="mt-1 flex items-center justify-between">
        <span className="rounded-md bg-ink-850 px-2 py-1 font-mono text-xs tabular-nums text-ink-200">
          {fmt(start)}
        </span>
        <span className="rounded-md bg-ink-850 px-2 py-1 font-mono text-xs tabular-nums text-ink-200">
          {fmt(end)}
        </span>
      </div>

      {/* Reset to whole video */}
      {!isFull && (
        <button
          type="button"
          onClick={() => setRange(null)}
          className="mt-2 text-xs font-medium text-brand-400 hover:underline"
        >
          Use whole video
        </button>
      )}
    </div>
  );
}

function Handle({ posLeft, onPointerDown, label }: {
  posLeft: string; onPointerDown: (e: React.PointerEvent) => void; label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      style={{ left: posLeft }}
      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-ink-950 bg-white shadow-[0_0_0_3px_rgba(109,94,252,0.35)] transition active:cursor-grabbing active:scale-110"
    />
  );
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const base = `${mm}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${base}` : base;
}
