"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Loader2, Subtitles } from "lucide-react";
import { api } from "@/lib/api";
import type { TranscriptResult, TranscriptSegment } from "@/lib/types";

/** SRT timestamp: HH:MM:SS,mmm */
function srtTs(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms % 1000, 3)}`;
}
/** VTT timestamp: HH:MM:SS.mmm */
function vttTs(sec: number): string {
  return srtTs(sec).replace(",", ".");
}

function toSrt(segs: TranscriptSegment[]): string {
  return segs
    .map((s, i) => `${i + 1}\n${srtTs(s.start)} --> ${srtTs(s.start + (s.dur || 2))}\n${s.text}\n`)
    .join("\n");
}
function toVtt(segs: TranscriptSegment[]): string {
  return (
    "WEBVTT\n\n" +
    segs.map((s) => `${vttTs(s.start)} --> ${vttTs(s.start + (s.dur || 2))}\n${s.text}\n`).join("\n")
  );
}

function download(filename: string, text: string, mime: string) {
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

/**
 * Free YouTube subtitle/caption downloader. Reuses the transcript backend (yt-dlp
 * caption fetch, no API keys) but the UX is download-first: SRT + VTT buttons.
 */
export function SubtitleTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);

  function slug(): string {
    return (
      (result?.title || "subtitles")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "subtitles"
    );
  }

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
      if (!r.ok) setError(r.error || "No subtitles available for this video.");
      else setResult(r);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40 sm:flex-row sm:items-center sm:pl-4"
      >
        <div className="flex flex-1 items-center gap-2 px-2 sm:px-0">
          <Subtitles className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            type="url"
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
          {loading ? "Fetching…" : "Get subtitles"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger-400" role="alert">{error}</p>}
      {!error && !result && (
        <p className="mt-3 text-xs text-ink-500">Free · no sign-up · downloads a ready-to-use SRT or VTT file</p>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim">
          <div className="flex items-start gap-3">
            {result.thumbnail_url ? (
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md">
                <Image src={result.thumbnail_url} alt="" fill sizes="80px" className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">{result.title}</h2>
              <p className="truncate text-xs text-ink-400">
                {result.segments.length} lines · {result.auto_generated ? "auto-generated" : "captions"}
                {result.language ? ` (${result.language})` : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => download(`${slug()}.srt`, toSrt(result.segments), "application/x-subrip")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90 active:scale-95"
            >
              <Download className="h-4 w-4" /> Download .SRT
            </button>
            <button
              type="button"
              onClick={() => download(`${slug()}.vtt`, toVtt(result.segments), "text/vtt")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              <Download className="h-4 w-4" /> Download .VTT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
