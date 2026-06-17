"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Clip, ClipsResponse } from "@/lib/types";
import { ClipCard } from "@/components/ClipCard";

// Client-side gallery ordering options.
type SortKey = "score" | "longest" | "shortest" | "rank";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "score", label: "Top score" },
  { id: "longest", label: "Longest" },
  { id: "shortest", label: "Shortest" },
  { id: "rank", label: "Order found" },
];

function sortClips(clips: Clip[], key: SortKey): Clip[] {
  const sorted = [...clips];
  switch (key) {
    case "longest":
      return sorted.sort((a, b) => b.end - b.start - (a.end - a.start));
    case "shortest":
      return sorted.sort((a, b) => a.end - a.start - (b.end - b.start));
    case "rank":
      return sorted.sort((a, b) => a.rank - b.rank);
    case "score":
    default:
      return sorted.sort((a, b) => b.virality_score - a.virality_score);
  }
}

export default function ClipGalleryPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { jobId } = params;
  const [data, setData] = useState<ClipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("score");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const sortedClips = useMemo(
    () => (data ? sortClips(data.clips, sort) : []),
    [data, sort],
  );

  // Sequentially trigger a browser download for each clip that has a final_url.
  // A short stagger between clicks keeps the browser from blocking the batch.
  async function downloadAll() {
    if (!data || downloadingAll) return;
    const withVideo = data.clips.filter((c) => c.final_url);
    if (withVideo.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < withVideo.length; i++) {
        const clip = withVideo[i]!;
        const name =
          (clip.suggested_title?.trim().replace(/\s+/g, "_") ||
            `clip_${clip.rank}`) + ".mp4";
        const a = document.createElement("a");
        a.href = clip.final_url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (i < withVideo.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  useEffect(() => {
    let alive = true;
    api
      .getClips(jobId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [jobId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-ink-500 hover:text-white"
          >
            ← Projects
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Your clips</h1>
          <p className="text-sm text-white/60">
            {data
              ? `${data.clips.length} clips · ranked by virality · scored with ${data.model}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && data.clips.some((c) => c.final_url) && (
            <button
              type="button"
              onClick={downloadAll}
              disabled={downloadingAll}
              className="rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-white/80 hover:border-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingAll ? "Downloading…" : "Download all"}
            </button>
          )}
          <Link
            href="/new"
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-white/80 hover:border-brand hover:text-white"
          >
            + New clips
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[9/16] animate-pulse rounded-2xl border border-ink-700 bg-ink-900/60"
            />
          ))}
        </div>
      )}

      {data && data.clips.length === 0 && (
        <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-8 text-center">
          <p className="text-lg font-semibold text-white">No clips found</p>
          <p className="mt-2 text-sm text-white/60">
            The scorer didn&apos;t find a 20–60s standout moment in this video. Try a
            longer or more substantive talking-head video.
          </p>
          <a
            href="/new"
            className="mt-4 inline-block rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-white/80 hover:border-brand hover:text-white"
          >
            ← Try another video
          </a>
        </div>
      )}

      {data && data.clips.length > 0 && (
        <>
          {/* Client-side sort pills */}
          <div className="inline-flex rounded-lg border border-ink-600 bg-ink-950 p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSort(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  sort === opt.id
                    ? "bg-brand text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedClips.map((clip) => (
              <ClipCard
                key={clip.rank}
                clip={clip}
                recommended={
                  clip.rank === 1 && clip.virality_score >= 80
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
