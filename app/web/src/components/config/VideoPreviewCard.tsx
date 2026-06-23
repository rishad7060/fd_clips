"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { VideoPreview } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Opus-style video preview, shown ~instantly after a URL is pasted.
 *
 * THE OPUS TRICK: a YouTube thumbnail is at a fully predictable CDN URL you can
 * build from the 11-char video id on the CLIENT - no backend round-trip. So we
 * render `i.ytimg.com/vi/<id>/maxresdefault.jpg` immediately; if it 404s (not all
 * videos have a maxres thumb) we fall back to `hqdefault.jpg` (always exists).
 *
 * The slow yt-dlp call (`api.getPreview`) runs in the BACKGROUND only to enrich
 * the resolution badge ("4K"/"1080p") + exact title - it never blocks the image.
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

  // The src whose image has actually painted. We key on the src string (not a
  // boolean) so it auto-resets when the src changes - no race between a reset
  // effect and the load callback (which previously left a CACHED image stuck at
  // opacity 0 because onLoad never fired for an already-complete image).
  const [loadedSrc, setLoadedSrc] = useState("");

  // Reset the thumbnail tier whenever the URL changes.
  useEffect(() => { setThumbTier("maxres"); }, [url]);

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

  // Backend thumbnail (from /preview): a real http(s) URL in the live API, or a
  // data: URI poster in mock mode - accept BOTH (the old http-only check left
  // mock with no fallback, so a blocked ytimg image showed a blank box).
  const backendThumb =
    preview?.thumbnail_url &&
    (preview.thumbnail_url.startsWith("http") || preview.thumbnail_url.startsWith("data:"))
      ? preview.thumbnail_url
      : "";

  // The image src: client-side YouTube CDN URL (instant), with a maxres→hq
  // ladder; once both YouTube tiers fail (ytimg blocked / region / adblock) we
  // fall back to the backend thumbnail so the box is NEVER left blank.
  const clientThumb = ytId
    ? thumbTier === "maxres"
      ? ytThumb(ytId, "maxresdefault")
      : thumbTier === "hq"
        ? ytThumb(ytId, "hqdefault")
        : "" // "fail" → use backendThumb below
    : "";
  const src = clientThumb || backendThumb;
  const imgLoaded = loadedSrc !== "" && loadedSrc === src;

  // Quality badge: the backend's real label (suppressed when it's a stub/error,
  // signalled by `note`), else infer from the YouTube tier - but ONLY once the
  // image has actually painted, so we never float an "HD" badge over a blank box.
  const badge =
    (preview && !preview.note ? preview.quality_label : "") ||
    (ytId && thumbTier === "maxres" && imgLoaded ? "HD" : "");

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
              // Key by src so React remounts on tier change → onLoad fires for
              // each new image even when swapping maxres→hq→backend.
              key={src}
              src={src}
              alt=""
              referrerPolicy="no-referrer"
              className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              // Ref callback handles the CACHED case: if the browser already had
              // the image, `complete` is true at mount and onLoad never fires -
              // so mark it loaded (and run the same maxres-placeholder check) here.
              ref={(img) => {
                if (img && img.complete && img.naturalWidth > 0) {
                  if (thumbTier === "maxres" && ytId && img.naturalWidth <= 121) {
                    setThumbTier("hq");
                  } else {
                    setLoadedSrc(img.currentSrc || img.src);
                  }
                }
              }}
              onLoad={(e) => {
                // YouTube serves a 120x90 gray placeholder (HTTP 404) for a
                // missing maxres - detect by natural width and downgrade.
                const img = e.currentTarget;
                if (thumbTier === "maxres" && ytId && img.naturalWidth > 0 && img.naturalWidth <= 121) {
                  setThumbTier("hq");
                  return;
                }
                setLoadedSrc(img.currentSrc || img.src);
              }}
              onError={() => {
                if (thumbTier === "maxres") setThumbTier("hq");
                else setThumbTier("fail");
              }}
            />
          ) : (
            // All image sources failed/blocked (e.g. ytimg blocked by an
            // ad-blocker/region) - show a clean branded poster, not a black box.
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-ink-800 to-ink-900 text-ink-300">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
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
