"use client";

import type { AspectRatio, ClipLength, Genre } from "@/lib/types";

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

export function ConfigPanel(p: Props) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-5">
      <h2 className="mb-4 text-sm font-bold text-white">AI clipping</h2>

      {/* Config row: genre · length · aspect · auto-hook */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Genre" value={p.genre} onChange={(v) => p.setGenre(v as Genre)} options={GENRES} />
        <Select label="Clip length" value={p.clipLength} onChange={(v) => p.setClipLength(v as ClipLength)} options={LENGTHS} />
        <Select label="Aspect ratio" value={p.aspectRatio} onChange={(v) => p.setAspectRatio(v as AspectRatio)} options={ASPECTS} />
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-ink-400">Auto hook</span>
          <button
            type="button"
            role="switch"
            aria-checked={p.autoHook}
            onClick={() => p.setAutoHook(!p.autoHook)}
            className={`mt-1 inline-flex h-6 w-11 items-center rounded-full transition ${p.autoHook ? "bg-brand" : "bg-ink-700"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${p.autoHook ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Include specific moments */}
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-ink-400">
          Include specific moments <span className="text-ink-600">(optional)</span>
        </label>
        <input
          value={p.includeMoments}
          onChange={(e) => p.setIncludeMoments(e.target.value)}
          placeholder="Example: find all the moments about pricing"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-brand focus:outline-none"
        />
      </div>

      {/* Number of clips */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-400">Number of clips</span>
          <span className="text-sm font-bold text-brand-400">{p.clipCount}</span>
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
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1 text-xs font-medium text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-sm text-white focus:border-brand focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    </label>
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
    <div className="mt-5 rounded-lg border border-ink-700 bg-ink-950/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-400">Processing timeframe</span>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">Credit saver</span>
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
          <span className="text-ink-600">→</span>
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
      <span className="text-xs text-ink-500">{label}</span>
      <input
        type="text"
        value={`${mm}:${String(ss).padStart(2, "0")}`}
        onChange={(e) => {
          const m = e.target.value.match(/^(\d+):(\d{1,2})$/);
          if (m) onChange(Number(m[1]) * 60 + Number(m[2]));
        }}
        className="w-16 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-center text-sm text-white focus:border-brand focus:outline-none"
        aria-label={`${label} time mm:ss`}
      />
    </label>
  );
}
