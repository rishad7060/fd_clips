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

  useEffect(() => {
    const u = url.trim();
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

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-56 overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
        {/* aspect-video poster */}
        <div className="aspect-video w-full">
          {preview?.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full animate-pulse place-items-center bg-ink-900 text-ink-600">
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
