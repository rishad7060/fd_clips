"use client";

import { useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

/**
 * Dumb trim track for the inline clip editor. Renders the ClipCard scrub rail
 * (bg-white/30 + bg-brand fill) where the fill maps the WINDOW [start,end] over
 * videoDuration, plus two draggable in/out handles and a window-relative
 * playhead dot. All values are RELATIVE offsets into the pre-cut video
 * (0..videoDuration).
 */

const MIN_GAP = 0.2;

export interface TrimBarProps {
  videoDuration: number;
  start: number;
  end: number;
  progress: number; // 0..1 window-relative
  onChange: (start: number, end: number) => void;
  onSeek: (frac: number) => void;
}

type ActiveHandle = "in" | "out" | null;

export function TrimBar({
  videoDuration,
  start,
  end,
  progress,
  onChange,
  onSeek,
}: TrimBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveHandle>(null);

  const dur = videoDuration > 0 ? videoDuration : Math.max(end, MIN_GAP);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / dur) * 100))}%`;
  const window = Math.max(0.001, end - start);
  const playheadPct = pct(start + progress * window);

  const fracFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const onHandleDown =
    (id: "in" | "out") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setActive(id);
      e.currentTarget.setPointerCapture(e.pointerId);
    };

  const onHandleMove =
    (id: "in" | "out") => (e: React.PointerEvent<HTMLDivElement>) => {
      if (active !== id) return;
      e.preventDefault();
      const seconds = fracFromClientX(e.clientX) * dur;
      if (id === "in") {
        onChange(Math.min(seconds, end - MIN_GAP), end);
      } else {
        onChange(start, Math.max(seconds, start + MIN_GAP));
      }
    };

  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setActive(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  };

  const onHandleKey =
    (id: "in" | "out") => (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 1 : 0.1;
      let delta = 0;
      if (e.key === "ArrowLeft") delta = -step;
      else if (e.key === "ArrowRight") delta = step;
      else return;
      e.preventDefault();
      if (id === "in") {
        onChange(Math.min(start + delta, end - MIN_GAP), end);
      } else {
        onChange(start, Math.max(end + delta, start + MIN_GAP));
      }
    };

  const onRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only treat clicks on the rail itself (not the handles) as a seek.
    if (e.target !== e.currentTarget) return;
    onSeek(fracFromClientX(e.clientX));
  };

  return (
    <div className="space-y-2">
      <div className="relative h-6 select-none">
        {/* Rail */}
        <div
          ref={trackRef}
          onClick={onRailClick}
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 cursor-pointer rounded-full bg-white/30"
        >
          {/* Window fill */}
          <div
            className="absolute top-0 h-full rounded-full bg-brand"
            style={{ left: pct(start), width: pct(end - start) }}
          />
          {/* Playhead */}
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ left: playheadPct }}
          />
        </div>

        {/* In handle */}
        <div
          role="slider"
          aria-label="In point"
          aria-valuemin={0}
          aria-valuemax={dur}
          aria-valuenow={start}
          tabIndex={0}
          onPointerDown={onHandleDown("in")}
          onPointerMove={onHandleMove("in")}
          onPointerUp={onHandleUp}
          onKeyDown={onHandleKey("in")}
          className="absolute top-1/2 z-10 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm bg-brand ring-2 ring-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ left: pct(start) }}
        />
        {/* Out handle */}
        <div
          role="slider"
          aria-label="Out point"
          aria-valuemin={0}
          aria-valuemax={dur}
          aria-valuenow={end}
          tabIndex={0}
          onPointerDown={onHandleDown("out")}
          onPointerMove={onHandleMove("out")}
          onPointerUp={onHandleUp}
          onKeyDown={onHandleKey("out")}
          className="absolute top-1/2 z-10 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm bg-brand ring-2 ring-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ left: pct(end) }}
        />
      </div>

      <div className="flex justify-end">
        <span className="rounded-md bg-ink-850 px-2 py-0.5 text-xs font-medium text-brand-400">
          {formatDuration(end - start)}
        </span>
      </div>
    </div>
  );
}
