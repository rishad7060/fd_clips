"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const MVP_CLIP_COUNT = 6;

/**
 * Opus-style hero input: a "Drop a video link" box with Upload + Google Drive
 * options and a prominent "Get clips in 1 click" button. Paste a URL or upload a
 * local file; both create a job and route to its live-progress page. Google Drive
 * is a visual stub (coming soon).
 */
export function HeroInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<null | "url" | "upload">(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(url.trim());

  async function createFromUrl() {
    if (busy) return; // guard against rapid double-submit
    const u = url.trim();
    if (!u) {
      setError("Paste a video link first.");
      return;
    }
    setBusy("url");
    setError(null);
    try {
      const job = await api.createJob({
        source_type: "url",
        source_url: u,
        clip_count: MVP_CLIP_COUNT,
      });
      router.push(`/jobs/${job.job_id}`);
    } catch (e) {
      setError(friendly(e));
      setBusy(null);
    }
  }

  async function createFromFile(file: File) {
    if (busy) return; // guard against rapid double-submit
    setBusy("upload");
    setError(null);
    setFileName(file.name);
    try {
      const { source_key } = await api.uploadFile(file);
      const job = await api.createJob({
        source_type: "upload",
        source_key,
        source_filename: file.name,
        clip_count: MVP_CLIP_COUNT,
      });
      router.push(`/jobs/${job.job_id}`);
    } catch (e) {
      setError(friendly(e));
      setBusy(null);
      setFileName(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border border-ink-700 bg-ink-900/80 p-3 shadow-2xl ring-1 ring-black/30">
        {/* URL box */}
        <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-950 px-3 py-3 focus-within:border-brand">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
          </svg>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && createFromUrl()}
            placeholder="Drop a video link — YouTube, TikTok, Instagram, X…"
            className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
          />
        </div>

        {/* Upload + Google Drive row */}
        <div className="mt-2 flex items-center gap-4 px-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
            </svg>
            {fileName ? truncate(fileName, 18) : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Reset so the SAME file can be re-picked after an error/retry.
              e.target.value = "";
              if (f) void createFromFile(f);
            }}
          />
          <span
            title="Google Drive import — coming soon"
            className="inline-flex cursor-not-allowed items-center gap-1.5 text-sm font-medium text-ink-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8l4 7-4 7H8l-4-7z" />
            </svg>
            Google Drive
            <span className="rounded bg-ink-800 px-1 py-0.5 text-[10px] font-semibold text-ink-400">Soon</span>
          </span>
        </div>

        {/* Get clips button */}
        <button
          type="button"
          onClick={createFromUrl}
          disabled={busy !== null}
          className="mt-3 w-full rounded-xl bg-white py-3 text-center text-sm font-bold text-ink-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy === "url" ? "Creating clips…" : busy === "upload" ? "Uploading…" : "Get clips in 1 click"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}
      {!error && looksLikeUrl && !busy && (
        <p className="mt-3 text-center text-xs text-ink-500">
          Press Enter or “Get clips” — we’ll find your {MVP_CLIP_COUNT} best moments.
        </p>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function friendly(e: unknown): string {
  const msg = String(e instanceof Error ? e.message : e);
  if (/413|too large|payload/i.test(msg)) return "That file is too large. Try a shorter clip or a link.";
  if (/network|fetch|failed to/i.test(msg)) return "Couldn’t reach the server. Check your connection and retry.";
  return msg.replace(/^Error:\s*/, "");
}
