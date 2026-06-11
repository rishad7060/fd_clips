"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ClipsResponse } from "@/lib/types";
import { ClipCard } from "@/components/ClipCard";

export default function ClipGalleryPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { jobId } = params;
  const [data, setData] = useState<ClipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <Link
          href="/new"
          className="rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-white/80 hover:border-brand hover:text-white"
        >
          + New clips
        </Link>
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

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.clips.map((clip) => (
            <ClipCard key={clip.rank} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
