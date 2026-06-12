"use client";

import { useRef, useState } from "react";
import type { Clip } from "@/lib/types";
import { formatDuration, scoreTextColor } from "@/lib/format";

/**
 * Opus-style clip card: the video PLAYS inline (hover to preview, click to
 * play/pause). On hover, like/dislike thumbs appear top-left and a centered
 * play button shows. A white "text hook" banner overlays near the top. Below
 * the video: a big virality score (bright green = high), the title, and a quick
 * action row (schedule / download / trim).
 *
 * Accessibility note: the player container is NOT a role="button" (it holds
 * nested interactive controls — thumbs, the play overlay — which can't be
 * nested inside a button). Play/pause is driven by an explicit overlay button
 * and pointer handlers on a plain region instead.
 */
export function ClipCard({ clip, recommended = false }: { clip: Clip; recommended?: boolean }) {
  const duration = clip.end - clip.start;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  // True once the user explicitly paused via click; suppresses hover-autoplay so
  // a deliberately-paused clip doesn't restart from 0 on the next hover.
  const [userPaused, setUserPaused] = useState(false);

  const hasVideo = Boolean(clip.final_url);
  const hasThumb = Boolean(clip.thumb_url);
  const safeName =
    (clip.suggested_title?.trim().replace(/\s+/g, "_") || `clip_${clip.rank}`) + ".mp4";

  const play = () => {
    const v = videoRef.current;
    if (v && hasVideo) void v.play().catch(() => {});
  };
  const onEnter = () => {
    if (!userPaused) play();
  };
  const onLeave = () => {
    const v = videoRef.current;
    // Only rewind the hover-preview; if the user clicked to play, leave it be.
    if (v && !playing && !userPaused) {
      v.pause();
      v.currentTime = 0;
    }
  };
  const toggle = () => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    if (v.paused) {
      setUserPaused(false);
      void v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };
  // Stop a thumb/control click from bubbling into the play/pause overlay.
  const react = (e: React.MouseEvent, value: "up" | "down") => {
    e.stopPropagation();
    setReaction((prev) => (prev === value ? null : value));
  };

  return (
    <div className="group flex flex-col">
      {/* Vertical 9:16 player */}
      <div
        className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-ink-700 transition group-hover:ring-brand/50"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            src={clip.final_url}
            poster={hasThumb ? clip.thumb_url : undefined}
            muted
            loop
            playsInline
            preload="metadata"
            // Keep React state in sync with the REAL element state so the overlay
            // and aria-label never lie (autoplay rejection, ended, etc.).
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          // Graceful fallback when the render URL is missing (e.g. still processing).
          <div className="grid h-full w-full place-items-center text-xs text-ink-500">
            Preview unavailable
          </div>
        )}

        {/* Text hook banner — white rounded card near the top */}
        {clip.hook_line && (
          <div className="pointer-events-none absolute inset-x-2 top-9 flex justify-center">
            <span className="line-clamp-2 max-w-full rounded-lg bg-white/90 px-3 py-1.5 text-center text-xs font-semibold leading-snug text-ink-950 shadow">
              {clip.hook_line}
            </span>
          </div>
        )}

        {recommended && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-brand px-2 py-1 text-[11px] font-bold text-white shadow-glow">
            ★ Recommended
          </span>
        )}
        <span className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {formatDuration(duration)}
        </span>

        {/* Like / Dislike — top-left, appear on hover (or once a reaction is set) */}
        <div
          className={`absolute left-2 z-10 flex gap-1 transition ${
            recommended ? "top-10" : "top-2"
          } ${reaction ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <button
            type="button"
            onClick={(e) => react(e, "up")}
            aria-label="Like clip"
            aria-pressed={reaction === "up"}
            className={`grid h-8 w-8 place-items-center rounded-md bg-black/50 backdrop-blur transition hover:bg-black/70 ${
              reaction === "up" ? "text-brand-400" : "text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4-7a2 2 0 012 2v3h4.5a2 2 0 011.96 2.39l-1.2 6A2 2 0 0116.3 20H7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => react(e, "down")}
            aria-label="Dislike clip"
            aria-pressed={reaction === "down"}
            className={`grid h-8 w-8 place-items-center rounded-md bg-black/50 backdrop-blur transition hover:bg-black/70 ${
              reaction === "down" ? "text-amber-400" : "text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 13V4h3a1 1 0 011 1v7a1 1 0 01-1 1h-3zm0 0l-4 7a2 2 0 01-2-2v-3H6.5a2 2 0 01-1.96-2.39l1.2-6A2 2 0 017.7 4H17" />
            </svg>
          </button>
        </div>

        {/* Play/pause — full-area transparent button (no nested controls inside).
            Shows a centered icon on hover or while paused. */}
        {hasVideo && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause clip" : "Play clip"}
            className="absolute inset-0 grid place-items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span
              className={`grid h-14 w-14 place-items-center rounded-full bg-black/50 backdrop-blur transition ${
                playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              }`}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </button>
        )}
      </div>

      {/* Score + actions row (big colored score, quick actions) */}
      <div className="mt-2.5 flex items-center justify-between">
        <span
          className={`text-3xl font-extrabold leading-none ${scoreTextColor(clip.virality_score)}`}
          title={`Virality score ${clip.virality_score}/100`}
        >
          {clip.virality_score}
        </span>
        <div className="flex items-center gap-1 text-white/60">
          <button
            type="button"
            title="Schedule (coming soon)"
            aria-label="Schedule clip"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
          {hasVideo ? (
            <a
              href={clip.final_url}
              download={safeName}
              title="Download"
              aria-label="Download clip"
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              </svg>
            </a>
          ) : (
            <span
              title="Download unavailable"
              aria-label="Download unavailable"
              className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-md text-ink-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              </svg>
            </span>
          )}
          <a
            href={`/jobs/${clip.job_id}/clips/${clip.rank}`}
            title="Edit (trim / captions)"
            aria-label="Edit clip"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </a>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
        {clip.suggested_title}
      </h3>
    </div>
  );
}
