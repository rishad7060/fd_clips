"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { VideoPreview } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Opus-style video preview, shown ~instantly after a URL is pasted.
 *
 * THE OPUS TRICK: a YouTube thumbnail is at a fully predictable CDN URL you can
 * build from the 11-char video id on the CLIENT — no backend round-trip. So we
 * render `i.ytimg.com/vi/<id>/maxresdefault.jpg` immediately; if it 404s (not all
 * videos have a maxres thumb) we fall back to `hqdefault.jpg` (always exists).
 *
 * The slow yt-dlp call (`api.getPreview`) runs in the BACKGROUND only to enrich
 * the resolution badge ("4K"/"1080p") + exact title — it never blocks the image.
 */

// Extract the 11-char video id from any YouTube URL form (watch / youtu.be /
// shorts / embed / live / v). Returns null for non-YouTube or no match.
function youTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

const ytThumb = (id: string, q: "maxresdefault" | "hqdefault") =>
  `https://i.ytimg.com/vi/${id}/${q}.jpg`;

export function VideoPreviewCard({ url }: { url: string }) {
  // Client-derived YouTube thumbnail (instant). Falls back maxres -> hq -> none.
  const ytId = youTubeId(url.trim());
  const [thumbTier, setThumbTier] = useState<"maxres" | "hq" | "fail">("maxres");

  // Background enrichment (badge + title); never blocks the thumbnail.
  const [preview, setPreview] = useState<VideoPreview | null>(null);

  // Track when the thumbnail image has actually painted so we can shimmer until then.
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset the thumbnail tier + loaded flag whenever the URL changes.
  useEffect(() => { setThumbTier("maxres"); setImgLoaded(false); }, [url]);

  // Fetch metadata in the background (debounced) for the quality badge + title.
  useEffect(() => {
    const u = url.trim();
    if (!/^(https?:\/\/|www\.)/i.test(u)) {
      setPreview(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api.getPreview(u).then((p) => alive && setPreview(p)).catch(() => alive && setPreview(null));
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [url]);

  // The image src: client-side YouTube CDN URL (instant), else the backend
  // thumbnail (non-YouTube), else nothing → placeholder.
  const clientThumb = ytId
    ? (thumbTier === "maxres" ? ytThumb(ytId, "maxresdefault")
      : thumbTier === "hq" ? ytThumb(ytId, "hqdefault") : "")
    : "";
  const backendThumb = preview?.thumbnail_url && preview.thumbnail_url.startsWith("http")
    ? preview.thumbnail_url : "";
  const src = clientThumb || backendThumb;

  // Quality badge: the backend's real label (suppressed when it's a stub/error,
  // signalled by `note`), else infer from the YouTube tier (maxres loaded → ≥720p
  // → show "HD"; nothing premature otherwise). Never claims a resolution we don't know.
  const badge = (preview && !preview.note ? preview.quality_label : "")
    || (ytId && thumbTier === "maxres" ? "HD" : "");

  // Nothing to show at all (not a URL, no client thumb, no backend thumb yet).
  if (!url.trim() || (!src && !ytId)) return null;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-56 overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-rim">
        <div className="relative aspect-video w-full">
          {/* Shimmer skeleton while the thumbnail paints (zero layout shift). */}
          {src && !imgLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              referrerPolicy="no-referrer"
              className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={(e) => {
                // YouTube serves a 120x90 gray placeholder (HTTP 404) for a
                // missing maxres — detect by natural width and downgrade.
                const img = e.currentTarget;
                if (thumbTier === "maxres" && ytId && img.naturalWidth > 0 && img.naturalWidth <= 121) {
                  setThumbTier("hq");
                  return;
                }
                setImgLoaded(true);
              }}
              onError={() => {
                if (thumbTier === "maxres") setThumbTier("hq");
                else setThumbTier("fail");
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-ink-900 text-ink-500">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h16v14H4zM4 9h16M9 5v14" strokeLinecap="round" /></svg>
            </div>
          )}
        </div>
        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </div>
      {preview?.title && preview.title !== "Preview" && (
        <p className="mt-2 line-clamp-1 max-w-56 text-xs font-medium text-ink-200" title={preview.title}>
          {preview.title}
        </p>
      )}
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-ink-400">
        Using video you don&apos;t own may violate copyright laws. By continuing, you confirm this is your own original content.
      </p>
    </div>
  );
}
