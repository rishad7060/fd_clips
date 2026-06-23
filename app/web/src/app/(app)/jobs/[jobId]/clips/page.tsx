"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Clip, ClipsResponse } from "@/lib/types";
import { ClipCard } from "@/components/ClipCard";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ClipCardSkeleton } from "@/components/ui/Skeleton";

/**
 * Opus-grade results gallery: a DENSE, scannable grid (up to 6 clips per row on
 * wide screens) with a results header - keyword/moment search, a sort menu, and
 * "Download all". Cards are compact; the page is built to feel faster and
 * cleaner than Opus.
 */
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

function matchesQuery(clip: Clip, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [
    clip.hook_title, clip.hook_line, clip.suggested_title, clip.reason,
  ].filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export default function ClipGalleryPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [data, setData] = useState<ClipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("score");
  const [query, setQuery] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const visibleClips = useMemo(() => {
    if (!data) return [];
    return sortClips(data.clips.filter((c) => matchesQuery(c, query)), sort);
  }, [data, sort, query]);

  async function downloadAll() {
    if (!data || downloadingAll) return;
    const withVideo = visibleClips.filter((c) => c.final_url);
    if (withVideo.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < withVideo.length; i++) {
        const clip = withVideo[i]!;
        const name = (clip.suggested_title?.trim().replace(/\s+/g, "_") || `clip_${clip.rank}`) + ".mp4";
        const a = document.createElement("a");
        a.href = clip.final_url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (i < withVideo.length - 1) await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  useEffect(() => {
    let alive = true;
    api.getClips(jobId).then((d) => alive && setData(d)).catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [jobId]);

  const total = data?.clips.length ?? 0;

  return (
    <div className="px-4 py-5 sm:px-6">
      {/* Results header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" aria-label="Back to projects">
            <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Button>
          </Link>
          <div>
            <SectionTitle className="leading-tight">Your clips</SectionTitle>
            <p className="text-xs text-ink-400">
              {data ? (
                <>
                  <span className="font-mono tabular-nums">{total}</span> clip{total === 1 ? "" : "s"} · ranked by virality
                </>
              ) : "Loading…"}
            </p>
          </div>
        </div>

        {/* Search clips by keyword/moment */}
        <div className="order-last w-full sm:order-none sm:ml-4 sm:max-w-sm sm:flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-2 transition focus-within:border-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find keywords or moments…"
              className="w-full bg-transparent text-sm text-white placeholder:text-ink-400 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-400 hover:text-white">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Sort menu + actions */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-36">
            <Select
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              aria-label="Sort clips"
              options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              className="py-2"
            />
          </div>
          {visibleClips.some((c) => c.final_url) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={downloadAll}
              loading={downloadingAll}
              disabled={downloadingAll}
            >
              {downloadingAll ? "Downloading…" : "Download all"}
            </Button>
          )}
          <Link href="/new">
            <Button variant="ghost" size="sm">+ New</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-danger-500/40 bg-danger-500/10 p-4 text-sm text-danger-300">{error}</Card>
      )}

      {/* Loading skeleton - dense grid */}
      {!data && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClipCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty states */}
      {data && total === 0 && (
        <EmptyState title="No clips found" body="The scorer didn't find a standout moment in this video. Try a longer or more substantive talking-head video." />
      )}
      {data && total > 0 && visibleClips.length === 0 && (
        <EmptyState title="No matches" body={`No clips match "${query}". Clear the search to see all ${total}.`} />
      )}

      {/* Dense clip grid - up to 6 per row */}
      {visibleClips.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visibleClips.map((clip) => (
            <ClipCard
              key={clip.rank}
              clip={clip}
              recommended={clip.rank === 1 && clip.virality_score >= 80}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-ink-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="14" height="16" rx="2" /><path d="M17 8l4-2v12l-4-2" />
        </svg>
      </span>
      <p className="mt-4 text-lg font-semibold tracking-tight text-white">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-300">{body}</p>
      <Link href="/new" className="mt-5 inline-block">
        <Button variant="secondary">Try another video</Button>
      </Link>
    </Card>
  );
}
