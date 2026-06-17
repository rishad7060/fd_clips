"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { VideoPreview } from "@/lib/types";

/**
 * Opus-style video preview shown after a URL is pasted: the source thumbnail
 * with a resolution badge ("4K" / "1080p"), title, and the copyright
 * disclaimer. Fetches lightweight metadata (no download). Stays quiet on error.
 */
export function VideoPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const [loading, setLoading] = useState(false);
  // Thumbnail load-failure handling: try a fallback URL once, then a placeholder.
  const [triedFallback, setTriedFallback] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const u = url.trim();
    // Reset the image fallback state whenever the URL changes.
    setTriedFallback(null);
    setImgFailed(false);
    if (!/^(https?:\/\/|www\.)/i.test(u)) {
      setPreview(null);
      setLoading(false); // else a partial/edited URL leaves the skeleton spinning
      return;
    }
    let alive = true;
    setLoading(true);
    // Debounce so we don't fetch on every keystroke.
    const t = setTimeout(() => {
      api
        .getPreview(u)
        .then((p) => alive && setPreview(p))
        .catch(() => alive && setPreview(null))
        .finally(() => alive && setLoading(false));
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [url]);

  if (!loading && !preview) return null;

  const displayedSrc = triedFallback || preview?.thumbnail_url || "";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-56 overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
        {/* aspect-video poster */}
        <div className="aspect-video w-full">
          {displayedSrc && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayedSrc}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={() => {
                // A YouTube thumbnail can 404 (no maxres) or be hotlink-blocked.
                // Try the always-present hqdefault.jpg once, then the placeholder.
                const fb = hqFallback(displayedSrc);
                if (fb && fb !== triedFallback) setTriedFallback(fb);
                else setImgFailed(true);
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-ink-900 text-ink-600">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h16v14H4zM4 9h16M9 5v14" strokeLinecap="round" /></svg>
            </div>
          )}
        </div>
        {preview?.quality_label && (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {preview.quality_label}
          </span>
        )}
      </div>
      {preview?.title && preview.title !== "Preview" && (
        <p className="mt-2 line-clamp-1 max-w-56 text-xs font-medium text-white/80" title={preview.title}>
          {preview.title}
        </p>
      )}
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-ink-500">
        Using video you don&apos;t own may violate copyright laws. By continuing, you confirm this is your own original content.
      </p>
    </div>
  );
}

/**
 * For a YouTube i.ytimg.com thumbnail that failed to load (e.g. a missing
 * maxresdefault), return the always-present hqdefault.jpg for that video id.
 * Returns null for non-YouTube/unrecognized URLs (no useful fallback).
 */
function hqFallback(src: string): string | null {
  const m = src.match(/i\.ytimg\.com\/vi(?:_webp)?\/([^/]+)\//);
  if (!m) return null;
  const hq = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  return hq === src ? null : hq;
}
