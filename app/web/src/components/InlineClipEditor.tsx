"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Clip } from "@/lib/types";
import { api } from "@/lib/api";
import { STYLE_TEMPLATES } from "@/lib/templates";
import { formatTimecode } from "@/lib/format";
import { useClipEditor } from "@/hooks/useClipEditor";
import { TrimBar } from "@/components/editor/TrimBar";
import { PositionPicker } from "@/components/editor/PositionPicker";
import { ColorPicker } from "@/components/editor/ColorPicker";

/**
 * Inline clip editor (Opus-style). Fully client-side live preview against the
 * pre-cut `final_url` video; the server re-render is OPTIONAL and never blocks
 * the live edit.
 */
const POSITION_CLASS: Record<"top" | "center" | "bottom", string> = {
  top: "top-6",
  center: "top-1/2 -translate-y-1/2",
  bottom: "bottom-8",
};

export function InlineClipEditor({ clip }: { clip: Clip }) {
  const router = useRouter();
  const { state, actions, player, videoRef, derived } = useClipEditor(clip);
  const { trimStart, trimEnd, hookText, highlightColor, position, templateId } =
    state;

  const hasVideo = Boolean(clip.final_url);

  // Optional server re-render state.
  const [rendering, setRendering] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renderNote, setRenderNote] = useState<string | null>(null);
  // True when the <video> fails to load (e.g. an expired signed URL).
  const [videoError, setVideoError] = useState(false);

  const safeName =
    (clip.suggested_title?.trim().replace(/\s+/g, "_") || `clip_${clip.rank}`) +
    ".mp4";

  async function reRender() {
    setRendering(true);
    setSaved(false);
    setRenderNote(null);
    try {
      await api.renderClip({
        job_id: clip.job_id,
        rank: clip.rank,
        // RenderClipInput.start/end are ABSOLUTE source seconds (server re-cuts
        // from source), so send the reconstructed absolute timecodes.
        start: derived.absoluteStart,
        end: derived.absoluteEnd,
        caption_lines: [
          {
            start: derived.absoluteStart,
            end: derived.absoluteEnd,
            text: hookText,
          },
        ],
        style: derived.style,
      });
      setSaved(true);
    } catch (e) {
      // Non-blocking: the live edit already works; just surface a note.
      setRenderNote(
        `Re-render unavailable right now (${String(e)}). Your edits are saved in this browser.`,
      );
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/jobs/${clip.job_id}/clips`}
          className="text-xs text-ink-500 hover:text-white"
        >
          ← Back to clips
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Edit clip #{clip.rank}
        </h1>
        <p className="text-sm text-white/60">{clip.suggested_title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        {/* LEFT — live preview */}
        <div className="space-y-4">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-ink-700">
            {hasVideo && !videoError ? (
              <video
                ref={videoRef}
                src={clip.final_url}
                poster={clip.thumb_url || undefined}
                muted={player.muted}
                autoPlay
                playsInline
                preload="metadata"
                onLoadedMetadata={player.onLoadedMetadata}
                onPlay={player.onPlay}
                onPause={player.onPause}
                onTimeUpdate={player.onTimeUpdate}
                onEnded={player.onEnded}
                onError={() => setVideoError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center px-4 text-center text-xs text-ink-500">
                {videoError
                  ? "Preview couldn't load (the link may have expired). Reload the page."
                  : "Preview unavailable"}
              </div>
            )}

            {/* Caption overlay */}
            <div
              className={`pointer-events-none absolute inset-x-3 z-10 flex justify-center ${POSITION_CLASS[position]}`}
            >
              <span
                dir="auto"
                className="inline-block max-w-[88%] whitespace-pre-wrap break-words rounded bg-black/70 px-2 py-1 text-center text-sm font-extrabold leading-relaxed"
                style={{ color: highlightColor }}
              >
                {hookText}
              </span>
            </div>

            {/* Play / pause */}
            {hasVideo && (
              <button
                type="button"
                onClick={player.toggle}
                aria-label={player.playing ? "Pause clip" : "Play clip"}
                className="absolute inset-0 z-20 grid place-items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full bg-black/50 backdrop-blur transition ${
                    player.playing ? "opacity-0 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  {player.playing ? (
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 translate-x-0.5 fill-white"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </span>
              </button>
            )}

            {/* Mute toggle */}
            {hasVideo && (
              <button
                type="button"
                onClick={player.toggleMute}
                aria-label={player.muted ? "Unmute" : "Mute"}
                className="absolute bottom-2 right-2 z-30 grid h-8 w-8 place-items-center rounded-md bg-black/50 text-white backdrop-blur hover:bg-black/70"
              >
                {player.muted ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Trim track */}
          <TrimBar
            videoDuration={derived.videoDuration}
            start={trimStart}
            end={trimEnd}
            progress={player.progress}
            onChange={actions.setTrim}
            onSeek={player.seek}
          />
        </div>

        {/* RIGHT — control panel */}
        <div className="space-y-5">
          {/* Position */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="mb-3 font-semibold text-white">Position</h2>
            <PositionPicker value={position} onChange={actions.setPosition} />
          </section>

          {/* Color */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="mb-3 font-semibold text-white">Highlight color</h2>
            <ColorPicker value={highlightColor} onChange={actions.setColor} />
          </section>

          {/* Text */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="mb-3 font-semibold text-white">Caption text</h2>
            <textarea
              value={hookText}
              dir="auto"
              rows={2}
              onChange={(e) => actions.setHookText(e.target.value)}
              className="min-h-[38px] w-full resize-y rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </section>

          {/* Style templates */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="mb-3 font-semibold text-white">Style</h2>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={templateId === t.id}
                  aria-label={`Style ${t.name}`}
                  onClick={() => actions.setTemplate(t.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    templateId === t.id
                      ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                      : "border-ink-700 bg-ink-850 hover:border-ink-500"
                  }`}
                >
                  <span
                    className="block rounded px-2 py-1.5 text-center text-[11px] font-bold"
                    style={{ background: "#000", color: t.style.highlight_color }}
                  >
                    ABC
                  </span>
                  <span className="mt-2 block text-xs font-medium text-white">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-ink-500">
                    {t.style.font}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Trim readout */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="mb-2 font-semibold text-white">Trim</h2>
            <p className="font-mono text-xs text-ink-500">
              {formatTimecode(derived.absoluteStart)} →{" "}
              {formatTimecode(derived.absoluteEnd)}
            </p>
            <p className="mt-1 text-sm text-brand-400">{derived.durationLabel}</p>
          </section>
        </div>
      </div>

      {/* FOOTER — optional re-render */}
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-5">
        <button
          type="button"
          onClick={reRender}
          disabled={rendering}
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-600 disabled:opacity-50"
        >
          {rendering ? "Re-rendering…" : "Apply & re-render (optional)"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-300">✓ Re-render requested</span>
        )}
        {hasVideo && (
          <a
            href={clip.final_url}
            download={safeName}
            className="rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-medium text-white/80 hover:border-brand hover:text-white"
          >
            Download current render
          </a>
        )}
        <button
          type="button"
          onClick={() => router.push(`/jobs/${clip.job_id}/clips`)}
          className="text-sm text-white/60 hover:text-white"
        >
          Done
        </button>
        {renderNote && (
          <p className="w-full text-xs text-amber-300">{renderNote}</p>
        )}
      </div>
    </div>
  );
}
