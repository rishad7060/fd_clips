"use client";

import type { AspectRatio, ClipLength, Genre } from "@/lib/types";
import { Select } from "@/components/ui/Select";
import { Panel, SectionTitle } from "@/components/ui/Card";

/**
 * Opus-style "AI clipping" config block: aspect ratio, clip length, genre,
 * auto-hook toggle, an "include specific moments" prompt, a processing-timeframe
 * range, and the clip-count slider. All controls drive the per-job config that
 * threads to the pipeline.
 */
const ASPECTS: { v: AspectRatio; label: string }[] = [
  { v: "9:16", label: "9:16" },
  { v: "1:1", label: "1:1" },
  { v: "16:9", label: "16:9" },
];
const LENGTHS: { v: ClipLength; label: string }[] = [
  { v: "auto", label: "Auto" },
  { v: "short", label: "<30s" },
  { v: "medium", label: "30–60s" },
  { v: "long", label: "60–90s" },
];
const GENRES: { v: Genre; label: string }[] = [
  { v: "auto", label: "Auto" },
  { v: "podcast", label: "Podcast" },
  { v: "marketing", label: "Marketing" },
  { v: "motivational", label: "Motivational" },
  { v: "webinar", label: "Webinar" },
  { v: "educational", label: "Educational" },
  { v: "comedy", label: "Comedy" },
];

interface Props {
  aspectRatio: AspectRatio; setAspectRatio: (v: AspectRatio) => void;
  clipLength: ClipLength; setClipLength: (v: ClipLength) => void;
  genre: Genre; setGenre: (v: Genre) => void;
  autoHook: boolean; setAutoHook: (v: boolean) => void;
  includeMoments: string; setIncludeMoments: (v: string) => void;
  range: { start: number; end: number } | null;
  setRange: (v: { start: number; end: number } | null) => void;
  clipCount: number; setClipCount: (v: number) => void;
}

// Map the local {v,label} shape onto the Select primitive's {value,label}.
const toOpts = (xs: { v: string; label: string }[]) => xs.map((o) => ({ value: o.v, label: o.label }));

export function ConfigPanel(p: Props) {
  return (
    <Panel className="p-5">
      <SectionTitle className="mb-4">AI clipping</SectionTitle>

      {/* Config row: genre · length · aspect · auto-hook */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Genre">
          <Select value={p.genre} onChange={(v) => p.setGenre(v as Genre)} options={toOpts(GENRES)} aria-label="Genre" />
        </Field>
        <Field label="Clip length">
          <Select value={p.clipLength} onChange={(v) => p.setClipLength(v as ClipLength)} options={toOpts(LENGTHS)} aria-label="Clip length" />
        </Field>
        <Field label="Aspect ratio">
          <Select value={p.aspectRatio} onChange={(v) => p.setAspectRatio(v as AspectRatio)} options={toOpts(ASPECTS)} aria-label="Aspect ratio" />
        </Field>
        <Field label="Auto hook">
          <button
            type="button"
            role="switch"
            aria-checked={p.autoHook}
            aria-label="Auto hook"
            onClick={() => p.setAutoHook(!p.autoHook)}
            className={`mt-0.5 inline-flex h-6 w-11 items-center rounded-full transition duration-200 ease-spring ${p.autoHook ? "bg-brand" : "bg-ink-700"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${p.autoHook ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </Field>
      </div>

      {/* Include specific moments */}
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-ink-300">
          Include specific moments <span className="text-ink-500">(optional)</span>
        </label>
        <input
          value={p.includeMoments}
          onChange={(e) => p.setIncludeMoments(e.target.value)}
          placeholder="Example: find all the moments about pricing"
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white transition placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
      </div>

      {/* Number of clips */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-300">Number of clips</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-brand-400">{p.clipCount}</span>
        </div>
        <input
          type="range" min={3} max={10} step={1} value={p.clipCount}
          onChange={(e) => p.setClipCount(Number(e.target.value))}
          aria-label="Number of clips"
          className="mt-1.5 w-full accent-brand"
        />
      </div>

      {/* Processing timeframe */}
      <ProcessingTimeframe range={p.range} setRange={p.setRange} />
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1.5 text-xs font-medium text-ink-300">{label}</span>
      {children}
    </div>
  );
}

/**
 * Processing timeframe ("Credit saver"): a toggle + two number inputs picking
 * the [start,end] second window of the source to process. Off = whole video.
 */
function ProcessingTimeframe({ range, setRange }: {
  range: { start: number; end: number } | null;
  setRange: (v: { start: number; end: number } | null) => void;
}) {
  const on = range !== null;
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-300">Processing timeframe</span>
          <span className="rounded-lg bg-success-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-success-400">Credit saver</span>
        </div>
        <button
          type="button"
          onClick={() => setRange(on ? null : { start: 0, end: 300 })}
          className="text-xs font-medium text-brand-400 hover:underline"
        >
          {on ? "Use whole video" : "Trim a range"}
        </button>
      </div>
      {on && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <TimeInput label="From" seconds={range!.start} onChange={(s) => setRange({ start: s, end: Math.max(s + 10, range!.end) })} />
          <span className="text-ink-500">→</span>
          <TimeInput label="To" seconds={range!.end} onChange={(e) => setRange({ start: range!.start, end: Math.max(range!.start + 10, e) })} />
        </div>
      )}
    </div>
  );
}

function TimeInput({ label, seconds, onChange }: { label: string; seconds: number; onChange: (s: number) => void }) {
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-ink-400">{label}</span>
      <input
        type="text"
        value={`${mm}:${String(ss).padStart(2, "0")}`}
        onChange={(e) => {
          const m = e.target.value.match(/^(\d+):(\d{1,2})$/);
          if (m) onChange(Number(m[1]) * 60 + Number(m[2]));
        }}
        className="w-16 rounded-lg border border-white/10 bg-ink-950 px-2 py-1 text-center font-mono text-sm tabular-nums text-white transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        aria-label={`${label} time mm:ss`}
      />
    </label>
  );
}
