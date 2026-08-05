"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Loader2, Tags } from "lucide-react";
import { api } from "@/lib/api";
import type { YoutubeTagsResult } from "@/lib/types";

/**
 * Free YouTube tags extractor. Shows the tags/keywords a public video uses (via
 * yt-dlp metadata - no API keys). Useful for competitor research + SEO.
 */
export function TagsTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YoutubeTagsResult | null>(null);
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    try {
      const r = await api.getYoutubeTags(value);
      if (!r.ok) setError(r.error || "Could not read this video.");
      else setResult(r);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tags.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40 sm:flex-row sm:items-center sm:pl-4"
      >
        <div className="flex flex-1 items-center gap-2 px-2 sm:px-0">
          <Tags className="h-5 w-5 shrink-0 text-ink-400" />
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
          {loading ? "Reading…" : "Extract tags"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger-400" role="alert">{error}</p>}
      {!error && !result && (
        <p className="mt-3 text-xs text-ink-500">Free · no sign-up · see any public video&apos;s tags</p>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-4">
            <div className="flex min-w-0 items-start gap-3">
              {result.thumbnail_url ? (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md">
                  <Image src={result.thumbnail_url} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">{result.title}</h2>
                <p className="truncate text-xs text-ink-400">
                  {result.channel && <span>{result.channel} · </span>}
                  {result.tags.length} tags
                </p>
              </div>
            </div>
            {result.tags.length > 0 && (
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {result.tags.length > 0 ? (
              result.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-ink-900 px-3 py-1 text-sm text-ink-100">
                  {t}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-400">This video has no public tags.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
