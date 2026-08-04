"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { JOB_STAGES, type Job, type JobProgressEvent, type JobStage } from "@/lib/types";

/** Narrated, user-facing stage copy (mirrors the progress page). */
const STAGE_DETAIL: Record<JobStage, string> = {
  ingest: "Fetching the source video",
  transcribe: "Turning speech into text",
  score: "Finding the most viral moments",
  extract: "Cutting the top moments",
  reframe: "Cropping to vertical 9:16",
  captions: "Burning in karaoke captions",
  done: "Wrapping up",
};

/**
 * Opus-style "Your video is processing" popup. Opened by clicking a RUNNING
 * project card (instead of navigating away to the full progress page). Shows
 * live progress over the same WebSocket the progress page uses, and when the job
 * completes it offers a button to view the finished clips.
 */
export function ProcessingModal({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  const [event, setEvent] = useState<JobProgressEvent | null>(null);

  useEffect(() => {
    // Seed from the job we already have, then subscribe to live updates.
    const unsub = api.subscribeProgress(job.job_id, (e) => setEvent(e));
    return () => unsub();
  }, [job.job_id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = event?.status ?? job.status;
  const stage = (event?.stage ?? job.stage) as JobStage;
  const progress = event?.progress ?? job.progress ?? 0;
  const done = status === "completed";
  const failed = status === "failed";
  const title = job.title ?? job.job_id;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Video processing status"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              {done ? "Your clips are ready 🎬" : failed ? "This job couldn't finish" : "Your video is processing"}
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              {done
                ? "Your ranked, captioned clips are ready to view."
                : failed
                  ? "Something went wrong - your credits were refunded if charged."
                  : "You'll get an email when it's done - or keep this open to watch progress."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>

        {/* Terminal-style status block (Opus-like) */}
        <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-ink-950 p-4 font-mono text-xs leading-relaxed">
          <p className="text-ink-300">
            <span className="text-white">Fetching video</span>{" "}
            <span className="text-brand-300 break-all">&quot;{title}&quot;</span>
          </p>
          {!failed && (
            <>
              <p className="text-ink-400">
                Stage: <span className="text-ink-200">{STAGE_DETAIL[stage] ?? stage}</span>
              </p>
              <p className={done ? "text-success-300" : "text-brand-300"}>
                {done ? "Done - clips ready ✓" : `Processing & analyzing… ${progress}%`}
              </p>
            </>
          )}
          {failed && <p className="text-danger-300 break-words">{event?.error ?? job.error ?? "Job failed."}</p>}
        </div>

        {/* Progress bar */}
        {!done && !failed && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {done ? (
            <Link
              href={`/jobs/${job.job_id}/clips`}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              View clips
            </Link>
          ) : failed ? (
            <Link
              href="/new"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              Try another video
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-ink-200 transition hover:bg-ink-800 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
