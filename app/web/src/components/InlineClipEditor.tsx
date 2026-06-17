"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CaptionLine, Clip } from "@/lib/types";
import { api } from "@/lib/api";
import { STYLE_TEMPLATES } from "@/lib/templates";
import { CaptionSwatch } from "@/components/config/CaptionSwatch";
import { formatTimecode } from "@/lib/format";
import { useClipEditor } from "@/hooks/useClipEditor";
import { TrimBar } from "@/components/editor/TrimBar";
import { PositionPicker } from "@/components/editor/PositionPicker";
import { ColorPicker } from "@/components/editor/ColorPicker";
import { LayerTabs, type EditorLayer } from "@/components/editor/LayerTabs";
import { FontSizePicker } from "@/components/editor/FontSizePicker";
import { SubtitleTimeline } from "@/components/editor/SubtitleTimeline";
import { CaptionOverlays } from "@/components/editor/CaptionOverlays";
import { Button } from "@/components/ui/Button";
import { Panel, SectionTitle, Label } from "@/components/ui/Card";

/**
 * Two-layer inline clip editor (CapCut / Opus-style). Fully client-side live
 * preview against the pre-cut `final_url` video with TWO independent overlay
 * layers — a HOOK banner box and a per-word KARAOKE subtitle layer fed by the
 * real transcript. Editing is instant client state; the server re-render is
 * OPTIONAL and never blocks the live edit.
 */
export function InlineClipEditor({ clip }: { clip: Clip }) {
  const router = useRouter();
  const { state, actions, player, videoRef, derived } = useClipEditor(clip);
  const { trimStart, trimEnd, templateId, currentRel, hook, subtitle } = state;

  const hasVideo = Boolean(clip.final_url);

  // Which layer's controls are visible in the right panel.
  const [activeLayer, setActiveLayer] = useState<EditorLayer>("hook");

  // Optional server re-render state.
  const [rendering, setRendering] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renderNote, setRenderNote] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  // The segment currently under the playhead (for timeline highlighting).
  const activeSegmentId =
    subtitle.segments.find(
      (s) => currentRel >= s.startRel && currentRel <= s.endRel,
    )?.id ?? null;

  const safeName =
    (clip.suggested_title?.trim().replace(/\s+/g, "_") || `clip_${clip.rank}`) +
    ".mp4";

  /** Build caption_lines from the subtitle segments (mock gallery convenience). */
  function buildCaptionLines(): CaptionLine[] {
    const lines: CaptionLine[] = subtitle.segments.map((s) => ({
      start: derived.absoluteStart + s.startRel,
      end: derived.absoluteStart + s.endRel,
      text: s.textOverride ?? s.words.map((w) => w.word).join(" ").trim(),
    }));
    if (hook.show && hook.text.trim()) {
      lines.unshift({
        start: derived.absoluteStart,
        end: derived.absoluteEnd,
        text: hook.text.trim(),
      });
    }
    return lines;
  }

  /**
   * Flatten the (possibly edited) subtitle segments into per-word
   * {word,start,end} in CLIP-RELATIVE seconds for the real renderer. When a
   * segment has a textOverride, distribute the override words evenly across the
   * segment's time span so the burned-in karaoke matches the edited text.
   */
  function buildCaptionWords() {
    if (!subtitle.show) return [];
    const out: { word: string; start: number; end: number }[] = [];
    for (const s of subtitle.segments) {
      if (s.textOverride && s.textOverride.trim()) {
        const toks = s.textOverride.trim().split(/\s+/);
        const span = Math.max(0.05, s.endRel - s.startRel);
        const per = span / toks.length;
        toks.forEach((t, i) =>
          out.push({
            word: t,
            start: +(s.startRel + i * per).toFixed(3),
            end: +(s.startRel + (i + 1) * per).toFixed(3),
          }),
        );
      } else {
        for (const w of s.words) {
          out.push({ word: w.word, start: w.start, end: w.end });
        }
      }
    }
    return out;
  }

  async function reRender() {
    setRendering(true);
    setSaved(false);
    setRenderNote(null);
    try {
      await api.renderClip({
        job_id: clip.job_id,
        rank: clip.rank,
        // RenderClipInput.start/end are ABSOLUTE source seconds.
        start: derived.absoluteStart,
        end: derived.absoluteEnd,
        caption_lines: buildCaptionLines(),
        // The EDITED per-word captions that actually bake into the rendered file.
        captions: buildCaptionWords(),
        style: derived.style,
      });
      setSaved(true);
    } catch (e) {
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
          className="inline-flex items-center gap-1 text-xs text-ink-400 transition hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back to clips
        </Link>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
          Edit clip #{clip.rank}
        </h1>
        <p className="text-sm text-ink-300">{clip.suggested_title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        {/* LEFT — live preview (sticky so it doesn't scroll away) */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-white/10 shadow-rim">
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

            {/* Two independent caption overlays (hook + karaoke subtitle) */}
            <CaptionOverlays
              hook={hook}
              subtitle={subtitle}
              currentRel={currentRel}
            />

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
          {/* Layer switcher */}
          <LayerTabs value={activeLayer} onChange={setActiveLayer} />

          {activeLayer === "hook" ? (
            <HookControls hook={hook} actions={actions} />
          ) : (
            <SubtitleControls
              subtitle={subtitle}
              actions={actions}
              activeSegmentId={activeSegmentId}
              transcriptLoaded={derived.transcriptLoaded}
            />
          )}

          {/* Style templates (apply to the subtitle layer) */}
          <Panel className="p-5">
            <SectionTitle>Style</SectionTitle>
            <p className="mb-3 mt-1 text-xs text-ink-400">
              Templates set the karaoke subtitle highlight + position.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={templateId === t.id}
                  aria-label={`Style ${t.name}`}
                  onClick={() => actions.setTemplate(t.id)}
                  className={`relative rounded-xl border p-3 text-left transition duration-150 ease-premium ${
                    templateId === t.id
                      ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                      : "border-white/10 bg-ink-850 hover:border-white/15 hover:bg-ink-800"
                  }`}
                >
                  {t.isNew && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-glow">
                      New
                    </span>
                  )}
                  <span className={`grid h-[52px] w-full place-items-center overflow-hidden rounded-lg ${t.preview.bg}`}>
                    <CaptionSwatch spec={t.preview} noCaption={t.noCaption} />
                  </span>
                  <span className="mt-2 block text-xs font-medium text-white">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          {/* Trim readout */}
          <Panel className="p-5">
            <SectionTitle>Trim</SectionTitle>
            <p className="mt-2 font-mono text-xs tabular-nums text-ink-300">
              {formatTimecode(derived.absoluteStart)} →{" "}
              {formatTimecode(derived.absoluteEnd)}
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-brand-300">{derived.durationLabel}</p>
          </Panel>
        </div>
      </div>

      {/* FOOTER — optional re-render */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <Button variant="primary" size="lg" onClick={reRender} loading={rendering} disabled={rendering}>
          {rendering ? "Re-rendering…" : "Apply & re-render"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            Re-render requested
          </span>
        )}
        <Button variant="ghost" onClick={actions.reset}>
          Reset edits
        </Button>
        {hasVideo && (
          <a href={clip.final_url} download={safeName}>
            <Button variant="secondary">Download current render</Button>
          </a>
        )}
        <Button variant="ghost" onClick={() => router.push(`/jobs/${clip.job_id}/clips`)}>
          Done
        </Button>
        {renderNote && (
          <p className="w-full text-xs text-warning-300">{renderNote}</p>
        )}
      </div>
    </div>
  );
}

// ---- Per-layer control panels ---------------------------------------------

type Actions = ReturnType<typeof useClipEditor>["actions"];

function HookControls({
  hook,
  actions,
}: {
  hook: ReturnType<typeof useClipEditor>["state"]["hook"];
  actions: Actions;
}) {
  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <SectionTitle>Hook banner</SectionTitle>
        <label className="flex items-center gap-2 text-xs text-ink-300">
          <input
            type="checkbox"
            checked={hook.show}
            onChange={(e) => actions.setHookShow(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Show
        </label>
      </div>

      <div>
        <Label className="mb-1 block">Text</Label>
        <textarea
          value={hook.text}
          dir="auto"
          rows={2}
          onChange={(e) => actions.setHookText(e.target.value)}
          className="min-h-[38px] w-full resize-y rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <Label className="mb-2 block">Text color</Label>
        <ColorPicker
          value={hook.color}
          onChange={actions.setHookColor}
          swatches={["#ffffff", "#FFE600", "#ff3b30", "#00e676", "#6d5efc", "#000000"]}
        />
      </div>

      <div>
        <Label className="mb-2 block">Box color</Label>
        <ColorPicker
          value={hook.boxColor}
          onChange={actions.setHookBoxColor}
          swatches={["#000000", "#ffffff", "#6d5efc", "#FFE600", "#ff3b30", "#0b0f1a"]}
        />
      </div>

      <div>
        <Label className="mb-2 block">Position</Label>
        <PositionPicker value={hook.position} onChange={actions.setHookPosition} />
      </div>

      <div>
        <Label className="mb-2 block">Font size</Label>
        <FontSizePicker value={hook.fontSize} onChange={actions.setHookFontSize} />
      </div>
    </Panel>
  );
}

function SubtitleControls({
  subtitle,
  actions,
  activeSegmentId,
  transcriptLoaded,
}: {
  subtitle: ReturnType<typeof useClipEditor>["state"]["subtitle"];
  actions: Actions;
  activeSegmentId: string | null;
  transcriptLoaded: boolean;
}) {
  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <SectionTitle>Subtitles (karaoke)</SectionTitle>
        <label className="flex items-center gap-2 text-xs text-ink-300">
          <input
            type="checkbox"
            checked={subtitle.show}
            onChange={(e) => actions.setSubtitleShow(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Show
        </label>
      </div>

      <div>
        <Label className="mb-2 block">Highlight color</Label>
        <ColorPicker
          value={subtitle.highlightColor}
          onChange={actions.setSubtitleHighlightColor}
        />
      </div>

      <div>
        <Label className="mb-2 block">Position</Label>
        <PositionPicker
          value={subtitle.position}
          onChange={actions.setSubtitlePosition}
        />
      </div>

      <div>
        <Label className="mb-2 block">Font size</Label>
        <FontSizePicker
          value={subtitle.fontSize}
          onChange={actions.setSubtitleFontSize}
        />
      </div>

      <div>
        <Label className="mb-2 block">Segments</Label>
        {!transcriptLoaded ? (
          <p className="text-xs text-ink-400">Loading transcript…</p>
        ) : (
          <SubtitleTimeline
            segments={subtitle.segments}
            activeId={activeSegmentId}
            onEditSegment={actions.setSegmentText}
          />
        )}
      </div>
    </Panel>
  );
}
