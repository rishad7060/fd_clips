"use client";

import { useRef, useState } from "react";
import type { Clip } from "@/lib/types";
import { formatDuration, scoreTextColor } from "@/lib/format";

/**
 * Opus-style clip card: the video sits PAUSED on its poster with a play button,
 * and plays ONLY when the user presses play (clicking again pauses) — like Opus.
 * It does NOT autoplay on hover. On hover, like/dislike thumbs appear top-left.
 * The hook is BURNED INTO the video (white box, first 5s), so we do not draw a
 * DOM hook banner here (it would double-stack). Below the video: a big virality
 * score (bright green = high), the title, and a quick action row
 * (schedule / download / trim).
 *
 * Accessibility note: the player container is NOT a role="button" (it holds
 * nested interactive controls — thumbs, the play overlay — which can't be
 * nested inside a button). Play/pause is driven by an explicit overlay button.
 */
export function ClipCard({ clip, recommended = false }: { clip: Clip; recommended?: boolean }) {
  const duration = clip.end - clip.start;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  // Player controls: mute + playback progress. The video plays only on an
  // explicit press of the play button (Opus-style), so default UNMUTED — when
  // someone deliberately presses play they want sound.
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 of clip duration
  const [hovering, setHovering] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasVideo = Boolean(clip.final_url);
  const hasThumb = Boolean(clip.thumb_url);
  const safeName =
    (clip.suggested_title?.trim().replace(/\s+/g, "_") || `clip_${clip.rank}`) + ".mp4";

  // Hover only reveals the controls bar — it never plays/pauses. The video
  // plays solely on an explicit press of the play button (Opus behavior).
  const onEnter = () => setHovering(true);
  const onLeave = () => setHovering(false);
  const toggle = () => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  };
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    const next = !muted;
    setMuted(next);
    if (v) v.muted = next;
  };
  // Seek: forward/backward via the scrub bar (fraction 0..1 of the clip).
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = frac * v.duration;
    setProgress(frac);
  };
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration && isFinite(v.duration)) setProgress(v.currentTime / v.duration);
  };
  const react = (e: React.MouseEvent, value: "up" | "down") => {
    e.stopPropagation();
    setReaction((prev) => (prev === value ? null : value));
  };
  // Copy the clip's shareable URL; show a brief "Copied!" confirmation.
  const copyLink = () => {
    if (!hasVideo || !navigator.clipboard?.writeText) return;
    void navigator.clipboard
      .writeText(clip.final_url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
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
            muted={muted}
            loop
            playsInline
            preload="metadata"
            // Keep React state in sync with the REAL element state so the overlay
            // and aria-label never lie (autoplay rejection, ended, etc.).
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={onTimeUpdate}
            className="h-full w-full object-cover"
          />
        ) : (
          // Graceful fallback when the render URL is missing (e.g. still processing).
          <div className="grid h-full w-full place-items-center text-xs text-ink-500">
            Preview unavailable
          </div>
        )}

        {/* NOTE: the hook is now BURNED INTO the video (Opus-style white box,
            first 5s — see pipeline/captions.py). We deliberately do NOT also draw
            a DOM banner here, or it double-stacks with the burned-in one (two
            white boxes). The burned-in hook is the single source of truth: it
            shows in the poster, on play, and on download. */}

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
            At rest the play icon is always visible (the card sits paused, Opus
            style); while playing it fades and the pause icon shows on hover. */}
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

        {/* Controls bar — scrub (forward/backward) + mute. Visible on hover or
            while playing; sits above the play overlay (z-20). */}
        {hasVideo && (
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 transition ${
              hovering || playing ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Scrub / seek bar */}
            <div
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              tabIndex={0}
              onClick={seek}
              className="group/seek relative h-3 flex-1 cursor-pointer"
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30" />
              <div
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover/seek:opacity-100"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            {/* Mute / unmute */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white hover:bg-white/15"
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M23 9l-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Score + actions row — compact for the dense grid */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-xl font-extrabold leading-none ${scoreTextColor(clip.virality_score)}`}
          title={`Virality score ${clip.virality_score}/100`}
        >
          {clip.virality_score}
        </span>
        <div className="flex items-center gap-0.5 text-white/60">
          <button
            type="button"
            title="Schedule (coming soon)"
            aria-label="Schedule clip"
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
          {hasVideo && (
            <button
              type="button"
              onClick={copyLink}
              title={copied ? "Copied!" : "Copy link"}
              aria-label={copied ? "Link copied" : "Copy clip link"}
              className={`grid h-7 w-7 place-items-center rounded-md hover:bg-ink-800 hover:text-white ${
                copied ? "text-brand-400" : ""
              }`}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
          )}
          {hasVideo ? (
            <a
              href={clip.final_url}
              download={safeName}
              title="Download"
              aria-label="Download clip"
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              </svg>
            </a>
          ) : (
            <span
              title="Download unavailable"
              aria-label="Download unavailable"
              className="grid h-7 w-7 cursor-not-allowed place-items-center rounded-md text-ink-600"
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
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </a>
        </div>
      </div>

      {/* Title — single line, compact for the dense grid */}
      <h3 className="mt-0.5 line-clamp-1 text-xs font-semibold leading-snug text-white" title={clip.suggested_title}>
        {clip.suggested_title}
      </h3>
    </div>
  );
}
