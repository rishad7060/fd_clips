"use client";

/**
 * Inline clip editor route - NOW LIVE.
 *
 * ClipCard.tsx (the gallery card's scissors/edit anchor, ~lines 300-310) links
 * directly to `/jobs/${clip.job_id}/clips/${clip.rank}`, so this editor is a
 * promoted, reachable feature. (An earlier comment here claimed the cards no
 * longer link to it - that was false against the current code.)
 *
 * This page is a thin shell: it fetches the clip by rank, handles loading/error,
 * then hands off to <InlineClipEditor>, which owns the live preview, trim,
 * caption position/color/text, style templates, and the OPTIONAL re-render.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Clip } from "@/lib/types";
import { InlineClipEditor } from "@/components/InlineClipEditor";

export default function ClipEditorPage({
  params,
}: {
  params: { jobId: string; rank: string };
}) {
  const { jobId } = params;
  const rank = Number(params.rank);

  const [clip, setClip] = useState<Clip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getClips(jobId)
      .then((d) => {
        if (!alive) return;
        const c = d.clips.find((x) => x.rank === rank);
        if (!c) {
          setError("Clip not found");
          return;
        }
        setClip(c);
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [jobId, rank]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-ink-700 bg-ink-900/60" />
    );
  }

  return <InlineClipEditor clip={clip} />;
}
