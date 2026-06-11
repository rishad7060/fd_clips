"use client";

/**
 * PHASE 2 FEATURE — NOT part of the v2 MVP.
 *
 * Per fd_clips_v2.md (Part 1: "Dashboard/editor: CUT — simple submit form +
 * results page. No editing"; Part 5 upgrade trigger: "Users ask to tweak clips
 * → Add trim + caption-edit + re-render page"), the per-clip editor (trim,
 * caption editing, style swap, re-render) is CUT from the MVP.
 *
 * This component is intentionally PRESERVED for when editing is turned back on,
 * but it is NOT a promoted path: it is not in the sidebar nav, and the gallery
 * cards no longer link to it (see ClipCard.tsx). The route still resolves if hit
 * directly. Do not delete — re-link from ClipCard to re-enable.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { CaptionLine, Clip, ClipStyle } from "@/lib/types";
import { STYLE_TEMPLATES, templateById } from "@/lib/templates";
import { formatTimecode, formatDuration } from "@/lib/format";

export default function ClipEditorPage({
  params,
}: {
  params: { jobId: string; rank: string };
}) {
  const { jobId } = params;
  const rank = Number(params.rank);
  const router = useRouter();

  const [clip, setClip] = useState<Clip | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable state.
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [templateId, setTemplateId] = useState("default");
  const [rendering, setRendering] = useState(false);
  const [saved, setSaved] = useState(false);

  // Bounds: allow trimming ±5s around the original window.
  const bounds = useMemo(
    () =>
      clip
        ? {
            min: Math.max(0, clip.start - 5),
            max: clip.end + 5,
          }
        : { min: 0, max: 100 },
    [clip],
  );

  useEffect(() => {
    let alive = true;
    api
      .getClips(jobId)
      .then((d) => {
        if (!alive) return;
        const c = d.clips.find((x) => x.rank === rank);
        if (!c) {
          setError("Clip not found");
          return;
        }
        setClip(c);
        setStart(c.start);
        setEnd(c.end);
        setCaptions(c.caption_lines.map((l) => ({ ...l })));
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [jobId, rank]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-ink-700 bg-ink-900/60" />
    );
  }

  const duration = Math.max(0, end - start);
  const style: ClipStyle = templateById(templateId).style;

  async function reRender() {
    if (!clip) return;
    setRendering(true);
    setSaved(false);
    try {
      const updated = await api.renderClip({
        job_id: jobId,
        rank,
        start,
        end,
        caption_lines: captions,
        style,
      });
      setClip(updated);
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/jobs/${jobId}/clips`}
          className="text-xs text-ink-500 hover:text-white"
        >
          ← Back to clips
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Edit clip #{clip.rank}
        </h1>
        <p className="text-sm text-white/60">{clip.suggested_title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* Preview */}
        <div className="space-y-3">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-ink-700 bg-ink-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clip.thumb_url}
              alt={clip.suggested_title}
              className="h-full w-full object-cover"
            />
            {/* Live caption preview overlay */}
            <div className="absolute inset-x-3 bottom-6 text-center">
              <span
                className="inline rounded bg-black/70 px-2 py-1 text-sm font-extrabold leading-relaxed"
                style={{ color: style.highlight_color }}
              >
                {captions[0]?.text ?? clip.hook_line}
              </span>
            </div>
            <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-accent">
              {clip.virality_score}
            </span>
          </div>
          <a
            href={clip.final_url}
            download={`${clip.suggested_title.replace(/\s+/g, "_")}.mp4`}
            className="block rounded-lg border border-ink-600 py-2 text-center text-sm font-medium text-white/80 hover:border-brand hover:text-white"
          >
            Download current render
          </a>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Trim */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Trim</h2>
              <span className="text-sm text-brand-400">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <TrimSlider
                label="Start"
                value={start}
                min={bounds.min}
                max={end - 1}
                onChange={(v) => setStart(Math.min(v, end - 1))}
              />
              <TrimSlider
                label="End"
                value={end}
                min={start + 1}
                max={bounds.max}
                onChange={(v) => setEnd(Math.max(v, start + 1))}
              />
            </div>
            <p className="mt-3 text-xs text-ink-500">
              {formatTimecode(start)} → {formatTimecode(end)}
            </p>
          </section>

          {/* Captions */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="font-semibold text-white">Captions</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Edit the text for each caption line.
            </p>
            <div className="mt-4 space-y-2">
              {captions.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-16 shrink-0 font-mono text-[11px] text-ink-500">
                    {formatTimecode(line.start)}
                  </span>
                  <textarea
                    value={line.text}
                    rows={1}
                    onChange={(e) => {
                      const next = [...captions];
                      next[i] = { ...line, text: e.target.value };
                      setCaptions(next);
                    }}
                    className="min-h-[38px] flex-1 resize-y rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Style / template picker */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
            <h2 className="font-semibold text-white">Style</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STYLE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
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

          {/* Re-render */}
          <div className="flex items-center gap-3">
            <button
              onClick={reRender}
              disabled={rendering}
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-600 disabled:opacity-50"
            >
              {rendering ? "Re-rendering…" : "Re-render clip"}
            </button>
            {saved && (
              <span className="text-sm text-emerald-300">
                ✓ Saved &amp; re-rendered
              </span>
            )}
            <button
              onClick={() => router.push(`/jobs/${jobId}/clips`)}
              className="text-sm text-white/60 hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrimSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-white/70">{label}</span>
        <span className="font-mono text-xs text-ink-500">
          {formatTimecode(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
