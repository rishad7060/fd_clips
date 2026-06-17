"use client";

import type { AspectRatio, ClipLength, Genre } from "@/lib/types";
import { Select } from "@/components/ui/Select";
import { Panel, SectionTitle } from "@/components/ui/Card";
import { TimelineRange } from "@/components/config/TimelineRange";

/**
 * Opus-style "AI clipping" config block: aspect ratio, clip length, genre,
 * auto-hook toggle, an "include specific moments" prompt, and a draggable
 * processing-timeframe over the real source duration. The AI decides how many
 * clips to produce (no count slider). All controls drive the per-job config.
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
  /** Source duration in seconds (from the preview); 0 = not known yet. */
  durationSec: number;
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

      {/* Processing timeframe — a real draggable timeline (Opus-style) once the
          source duration is known; the AI decides how many clips itself. */}
      <ProcessingTimeframe range={p.range} setRange={p.setRange} durationSec={p.durationSec} />
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
 * Processing timeframe ("Credit saver"): a real draggable timeline over the
 * source's actual duration (Opus-style). Until the duration is known (preview
 * still loading) it processes the whole video. Off = whole video.
 */
function ProcessingTimeframe({ range, setRange, durationSec }: {
  range: { start: number; end: number } | null;
  setRange: (v: { start: number; end: number } | null) => void;
  durationSec: number;
}) {
  const known = durationSec > 0;
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/50 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink-300">Processing timeframe</span>
        <span className="rounded-lg bg-success-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-success-400">Credit saver</span>
      </div>
      {known ? (
        <TimelineRange durationSec={durationSec} range={range} setRange={setRange} />
      ) : (
        <p className="mt-2 text-xs text-ink-400">Processing the whole video. Paste a link to trim a range.</p>
      )}
    </div>
  );
}
