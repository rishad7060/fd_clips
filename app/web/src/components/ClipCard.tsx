"use client";

import { useRef, useState } from "react";
import type { Clip } from "@/lib/types";
import { formatDuration, scoreTextColor } from "@/lib/format";

/**
 * Opus-style clip card: the video PLAYS inline (hover to preview, click to
 * play/pause), with a big virality score, a "Recommended" badge on top picks,
 * and quick actions. Editing (trim/caption) is Phase 2 — the scissors button is
 * a placeholder that links to the per-clip route when that ships.
 */
export function ClipCard({ clip, recommended = false }: { clip: Clip; recommended?: boolean }) {
  const duration = clip.end - clip.start;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const onEnter = () => {
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
  };
  const onLeave = () => {
    const v = videoRef.current;
    if (v && !playing) {
      v.pause();
      v.currentTime = 0;
    }
  };
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="group flex flex-col">
      {/* Vertical 9:16 player */}
      <div
        className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-ink-700 transition group-hover:ring-brand/50"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={toggle}
        role="button"
        tabIndex={0}
      >
        <video
          ref={videoRef}
          src={clip.final_url}
          poster={clip.thumb_url}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />

        {recommended && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-1 text-[11px] font-bold text-white shadow-glow">
            ★ Recommended
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {formatDuration(duration)}
        </span>

        {/* Play affordance (hidden while playing) */}
        {!playing && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-80 transition group-hover:opacity-0">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/50 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
      </div>

      {/* Score + actions row (Opus-style: big colored score, quick actions) */}
      <div className="mt-2.5 flex items-center justify-between">
        <span
          className={`text-2xl font-extrabold ${scoreTextColor(clip.virality_score)}`}
          title={`Virality score ${clip.virality_score}/100`}
        >
          {clip.virality_score}
        </span>
        <div className="flex items-center gap-1 text-white/60">
          <a
            href={clip.final_url}
            download={`${clip.suggested_title.replace(/\s+/g, "_")}.mp4`}
            title="Download"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
          </a>
          <a
            href={`/jobs/${clip.job_id}/clips/${clip.rank}`}
            title="Edit (trim / captions)"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </a>
        </div>
      </div>

      {/* Title + hook */}
      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
        {clip.suggested_title}
      </h3>
      <p className="mt-1 line-clamp-1 text-xs text-white/50">“{clip.hook_line}”</p>
    </div>
  );
}
