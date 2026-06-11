"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { JOB_STAGES, type JobProgressEvent, type JobStage } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";

const STAGE_LABEL: Record<JobStage, string> = {
  ingest: "Ingest",
  transcribe: "Transcribe",
  score: "Score moments",
  extract: "Extract clips",
  reframe: "Reframe vertical",
  captions: "Burn captions",
  done: "Done",
};

const VISIBLE_STAGES = JOB_STAGES.filter((s) => s !== "done");

function stageState(
  stage: JobStage,
  current: JobStage,
  status: string,
): "done" | "active" | "pending" {
  const order = JOB_STAGES.indexOf(stage);
  const cur = JOB_STAGES.indexOf(current);
  if (status === "completed") return "done";
  if (order < cur) return "done";
  if (order === cur) return "active";
  return "pending";
}

export default function JobProgressPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { jobId } = params;
  const router = useRouter();
  const [event, setEvent] = useState<JobProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    const unsub = api.subscribeProgress(jobId, (e) => {
      setEvent(e);
      if (e.status === "failed") setError(e.error ?? "Job failed");
      if (e.status === "completed" && !redirected.current) {
        redirected.current = true;
        // Brief pause so the user sees the 100% state, then go to the gallery.
        setTimeout(() => router.push(`/jobs/${jobId}/clips`), 900);
      }
    });
    return unsub;
  }, [jobId, router]);

  const progress = event?.progress ?? 0;
  const status = event?.status ?? "queued";
  const stage = event?.stage ?? "ingest";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Generating clips</h1>
          <p className="font-mono text-xs text-ink-500">{jobId}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Big progress ring + percent */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-8 text-center">
        <ProgressRing value={progress} />
        <p className="mt-4 text-lg font-semibold text-white">
          {event?.message ?? "Queued…"}
        </p>
        {typeof event?.clips_ready === "number" && event.clips_ready > 0 && (
          <p className="mt-1 text-sm text-emerald-300">
            {event.clips_ready} clip{event.clips_ready === 1 ? "" : "s"} ready
          </p>
        )}
      </div>

      {/* Stage timeline */}
      <ol className="space-y-2">
        {VISIBLE_STAGES.map((s) => {
          const st = stageState(s, stage, status);
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                st === "active"
                  ? "border-brand/50 bg-brand/10"
                  : st === "done"
                    ? "border-ink-700 bg-ink-900/40"
                    : "border-ink-800 bg-ink-950/40"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  st === "done"
                    ? "bg-emerald-500 text-white"
                    : st === "active"
                      ? "bg-brand text-white"
                      : "bg-ink-700 text-ink-500"
                }`}
              >
                {st === "done" ? "✓" : st === "active" ? "" : ""}
                {st === "active" && (
                  <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                )}
              </span>
              <span
                className={`text-sm font-medium ${
                  st === "pending" ? "text-ink-500" : "text-white"
                }`}
              >
                {STAGE_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#283049" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#6d5efc"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-3xl font-extrabold text-white">
        {value}%
      </span>
    </div>
  );
}
