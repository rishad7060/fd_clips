"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { JOB_STAGES, type JobProgressEvent, type JobStage } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { Card, Panel, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClipCardSkeleton } from "@/components/ui/Skeleton";

/** Narrated, user-facing stage copy mapped to the 6 pipeline stages. */
const STAGE: Record<JobStage, { label: string; detail: string }> = {
  ingest: { label: "Download", detail: "Fetching the source video" },
  transcribe: { label: "Transcribe", detail: "Turning speech into text" },
  score: { label: "Finding viral moments", detail: "Scoring the best clips" },
  extract: { label: "Extract", detail: "Cutting the top moments" },
  reframe: { label: "Reframe", detail: "Cropping to vertical 9:16" },
  captions: { label: "Caption", detail: "Burning in karaoke captions" },
  done: { label: "Done", detail: "Wrapping up" },
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

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
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
  const [elapsed, setElapsed] = useState(0);
  const redirected = useRef(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    const apply = (
      status: string,
      stage: JobStage,
      progress: number,
      message: string,
      jobError?: string | null,
    ) => {
      if (cancelled) return;
      setEvent({
        job_id: jobId,
        status: status as JobProgressEvent["status"],
        stage,
        progress,
        message,
        error: jobError ?? null,
      } as JobProgressEvent);
      if (status === "failed") setError(jobError || "Job failed");
      if (status === "completed" && !redirected.current) {
        redirected.current = true;
        setTimeout(() => router.push(`/jobs/${jobId}/clips`), 900);
      }
    };

    // 1) Fetch the current job state immediately. A job can fail fast at ingest
    //    (e.g. a YouTube download blocked by bot-check) BEFORE the progress
    //    WebSocket connects — in that case the socket never delivers the
    //    'failed' event and the page would otherwise hang on "Queued…". This
    //    one-shot fetch reflects an already-terminal job right away.
    api
      .getJob(jobId)
      .then((j) => {
        if (j.status === "failed" || j.status === "completed") {
          apply(j.status, j.stage, j.progress, j.error || `Job ${j.status}`, j.error);
        }
      })
      .catch(() => {
        /* job not found yet / transient — the socket below will catch up */
      });

    // 2) Subscribe to live progress for the normal running case.
    const unsub = api.subscribeProgress(jobId, (e) => {
      apply(e.status, e.stage, e.progress, e.message ?? "", e.error);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [jobId, router]);

  // Time-elapsed ticker — stops once the job reaches a terminal state.
  const status = event?.status ?? "queued";
  const terminal = status === "completed" || status === "failed" || status === "canceled";
  useEffect(() => {
    if (terminal) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(id);
  }, [terminal]);

  const progress = event?.progress ?? 0;
  const stage = event?.stage ?? "ingest";

  // Rough ETA from how long we've run vs. percent done (only once we have signal).
  const eta =
    !terminal && progress > 4 && progress < 100
      ? Math.max(0, (elapsed / progress) * (100 - progress))
      : null;

  const clipsReady = typeof event?.clips_ready === "number" ? event.clips_ready : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Generating clips
          </h1>
          <p className="mt-1 font-mono text-xs tabular-nums text-ink-400">{jobId}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Big progress ring + narrated current step */}
      <Card className="p-8 text-center">
        <ProgressRing value={progress} />
        <p className="mt-5 text-lg font-semibold tracking-tight text-white">
          {event?.message || STAGE[stage]?.detail || "Queued…"}
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink-400">
          <span className="font-mono tabular-nums">
            Elapsed {formatElapsed(elapsed)}
          </span>
          {eta != null && (
            <>
              <span className="text-ink-600">·</span>
              <span className="font-mono tabular-nums">~{formatElapsed(eta)} left</span>
            </>
          )}
        </div>
        {clipsReady > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-success-500/15 px-2.5 py-1 text-xs font-medium text-success-300">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {clipsReady} clip{clipsReady === 1 ? "" : "s"} ready
          </p>
        )}
      </Card>

      {/* Narrated stage timeline */}
      <Panel className="p-2">
        <ol className="space-y-1">
          {VISIBLE_STAGES.map((s) => {
            const st = stageState(s, stage, status);
            return (
              <li
                key={s}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  st === "active" ? "bg-brand/10 ring-1 ring-brand/40" : ""
                }`}
              >
                <StageBadge state={st} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      st === "pending" ? "text-ink-400" : "text-white"
                    }`}
                  >
                    {STAGE[s].label}
                  </p>
                  {st === "active" && (
                    <p className="truncate text-xs text-ink-300">{STAGE[s].detail}</p>
                  )}
                </div>
                {st === "active" && (
                  <span className="shrink-0 text-xs font-medium text-brand-300">
                    In progress
                  </span>
                )}
                {st === "done" && (
                  <span className="shrink-0 text-xs text-ink-400">Done</span>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* Skeleton clip previews — "your clips are being prepared" */}
      {!error && (
        <section className="space-y-3">
          <SectionTitle className="text-sm text-ink-300">
            Your clips are being prepared
          </SectionTitle>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ClipCardSkeleton key={i} />
            ))}
          </div>
        </section>
      )}

      {/* Failure states — upgrade-gate vs generic */}
      {error && (() => {
        const needsUpgrade = /upgrade|plan|too long|longer videos/i.test(error);
        return needsUpgrade ? (
          <Card className="space-y-3 border-brand/40 bg-brand/10 p-5">
            <p className="text-base font-semibold tracking-tight text-white">
              Video too long for the Free plan
            </p>
            <p className="break-words text-sm text-ink-200">{error}</p>
            <p className="text-xs text-ink-400">
              Your credit was refunded. Longer videos need a paid plan.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="/billing">
                <Button variant="primary">Upgrade plan</Button>
              </a>
              <a href="/new">
                <Button variant="secondary">Try a shorter video</Button>
              </a>
            </div>
          </Card>
        ) : (
          <Card className="space-y-3 border-danger-500/40 bg-danger-500/10 p-5">
            <p className="text-base font-semibold tracking-tight text-danger-300">
              This job couldn&apos;t finish
            </p>
            <p className="break-words text-sm text-ink-200">{error}</p>
            <a href="/new">
              <Button variant="secondary">Try another video</Button>
            </a>
          </Card>
        );
      })()}
    </div>
  );
}

/** Stage status badge: check (done), spinning ring (active), dot (pending). */
function StageBadge({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success-500 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 ring-1 ring-brand/40">
        <svg className="h-5 w-5 animate-spin text-brand-300" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 ring-1 ring-white/10">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#905BF4"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-premium"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-3xl font-semibold tabular-nums text-white">
        {value}%
      </span>
    </div>
  );
}
