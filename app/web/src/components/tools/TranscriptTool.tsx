"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Captions, Check, Copy, Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { TranscriptResult, TranscriptSegment } from "@/lib/types";

type View = "plain" | "timestamped";

/** hh:mm:ss (or mm:ss under an hour) for a seconds value. */
function fmtTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(2, "0");
  const sss = String(ss).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${sss}` : `${m}:${sss}`;
}

/** SRT timestamp: HH:MM:SS,mmm */
function srtTs(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mmm = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(mmm, 3)}`;
}

function toSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => {
      const end = seg.start + (seg.dur || 2);
      return `${i + 1}\n${srtTs(seg.start)} --> ${srtTs(end)}\n${seg.text}\n`;
    })
    .join("\n");
}

function download(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** A small button that copies text and flips to a check for 2s. */
function CopyButton({ getText, label }: { getText: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked - no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function TranscriptTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [view, setView] = useState<View>("plain");

  const slug = useMemo(() => {
    const base = (result?.title || "transcript")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return base || "transcript";
  }, [result?.title]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const value = url.trim();
    if (!/^https?:\/\/.+/i.test(value)) {
      setError("Paste a full video link (starting with https://).");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await api.getTranscript(value);
      if (!r.ok) {
        setError(r.error || "No transcript available for this video.");
      } else {
        setResult(r);
      }
    } catch {
      setError("Something went wrong fetching the transcript. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const timestamped = useMemo(
    () =>
      result
        ? result.segments.map((s) => `[${fmtTs(s.start)}] ${s.text}`).join("\n")
        : "",
    [result],
  );

  return (
    <div>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40 sm:flex-row sm:items-center sm:pl-4"
      >
        <div className="flex flex-1 items-center gap-2 px-2 sm:px-0">
          <Captions className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste a YouTube video link…"
            aria-label="YouTube video link"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Fetching…" : "Get transcript"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-danger-400" role="alert">
          {error}
        </p>
      )}
      {!error && !result && (
        <p className="mt-3 text-xs text-ink-500">
          Free · no sign-up · works with any public YouTube video that has captions
        </p>
      )}

      {/* ── Result ────────────────────────────────────────────────────────── */}
      {result && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] p-4">
            <div className="flex min-w-0 items-start gap-3">
              {result.thumbnail_url ? (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={result.thumbnail_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">{result.title}</h2>
                <p className="truncate text-xs text-ink-400">
                  {result.channel && <span>{result.channel} · </span>}
                  {fmtTs(result.duration_sec)} · {result.segments.length} lines ·{" "}
                  {result.auto_generated ? "auto-generated" : "captions"}
                  {result.language ? ` (${result.language})` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar: view toggle + copy/download */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] p-3">
            <div className="inline-flex rounded-lg border border-white/10 bg-ink-900 p-0.5 text-xs">
              {(["plain", "timestamped"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    view === v ? "bg-ink-700 text-white" : "text-ink-300 hover:text-white"
                  }`}
                >
                  {v === "plain" ? "Plain text" : "Timestamps"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton
                getText={() => (view === "plain" ? result.text : timestamped)}
                label="Copy"
              />
              <button
                type="button"
                onClick={() => download(`${slug}.txt`, result.text)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" /> .txt
              </button>
              <button
                type="button"
                onClick={() => download(`${slug}.srt`, toSrt(result.segments))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" /> .srt
              </button>
            </div>
          </div>

          {/* Transcript body */}
          <div className="max-h-[28rem] overflow-y-auto p-4">
            {view === "plain" ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-ink-100">{result.text}</p>
            ) : (
              <div className="space-y-1.5">
                {result.segments.map((s, i) => (
                  <div key={i} className="flex gap-3 text-sm leading-6">
                    <span className="shrink-0 font-mono text-xs text-brand-300">{fmtTs(s.start)}</span>
                    <span className="text-ink-100">{s.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-sell to the paid app */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-brand/[0.06] p-4">
            <p className="text-sm text-ink-200">
              Want <span className="font-semibold text-white">ranked, captioned vertical clips</span>{" "}
              from this video?
            </p>
            <a
              href={`/new${result.video_id ? `?url=${encodeURIComponent(`https://youtu.be/${result.video_id}`)}` : ""}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-white/90 active:scale-95"
            >
              Make clips - free
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
