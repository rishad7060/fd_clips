"use client";

import type { Clip } from "@/lib/types";
import { formatDuration, scoreColor } from "@/lib/format";

// PHASE 2: the per-clip editor (trim / caption-edit / re-render) is cut from the
// MVP per fd_clips_v2.md (Part 1 "Dashboard/editor: CUT" and Part 5 upgrade
// trigger "Users ask to tweak clips"). The gallery card therefore shows ONLY a
// Download action. To bring editing back, re-add a Link to
// `/jobs/${clip.job_id}/clips/${clip.rank}` (that route component is preserved).

export function ClipCard({ clip }: { clip: Clip }) {
  const duration = clip.end - clip.start;
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 transition hover:border-brand/50">
      {/* Vertical 9:16 preview */}
      <div className="relative aspect-[9/16] overflow-hidden bg-ink-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clip.thumb_url}
          alt={clip.suggested_title}
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-bold ring-1 ${scoreColor(
            clip.virality_score,
          )}`}
        >
          {clip.virality_score}
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
          {formatDuration(duration)}
        </span>
        <span className="absolute left-2 bottom-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white/80">
          #{clip.rank}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-white">
          {clip.suggested_title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-white/60">
          “{clip.hook_line}”
        </p>

        <div className="mt-4 flex items-center gap-2">
          <a
            href={clip.final_url}
            download={`${clip.suggested_title.replace(/\s+/g, "_")}.mp4`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Download
          </a>
          {/* PHASE 2: an "Edit" link to the per-clip editor route lived here.
              Removed for the MVP (editor is cut). See the note at the top. */}
        </div>
      </div>
    </div>
  );
}
