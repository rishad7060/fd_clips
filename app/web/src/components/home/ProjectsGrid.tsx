"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Opus-style projects grid below the hero. Each project is a card with a poster
 * thumbnail (derived from the rank-1 clip when completed), title, status and
 * clip count. Clicking opens the gallery (completed) or live progress (running).
 */
export function ProjectsGrid() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll while ANY job is still in flight so progress bars/status pills animate
  // as the background pipeline runs, then stop once every job is terminal so we
  // don't hammer the API forever. A single interval is (re)created from the
  // latest fetch result; the cleanup clears it so no timer leaks.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const isTerminal = (s: Job["status"]) =>
      s === "completed" || s === "failed" || s === "canceled";

    const tick = () => {
      api
        .listJobs()
        .then((j) => {
          if (!alive) return;
          setJobs(j);
          // Stop polling once nothing is left running/queued.
          if (timer && j.every((job) => isTerminal(job.status))) {
            clearInterval(timer);
            timer = null;
          }
        })
        .catch((e) => alive && setError(String(e)));
    };

    tick();
    timer = setInterval(tick, 2500);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 sm:px-8">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>
          All projects{jobs ? <span className="font-mono tabular-nums text-ink-400"> ({jobs.length})</span> : ""}
        </SectionTitle>
        <Link href="/new" className="text-sm font-medium text-brand-400 hover:text-brand">
          + New clips
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-500/40 bg-danger-500/10 p-4 text-sm text-danger-300">
          {error}
        </div>
      )}

      {jobs === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-2xl" />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-ink-200">No projects yet — paste a link above to make your first clips.</p>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.map((job) => (
            <ProjectCard key={job.job_id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ job }: { job: Job }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const produced = job.clips_produced ?? 0;
  const completed = job.status === "completed";
  const completedNoClips = completed && produced === 0;
  const href = completed ? `/jobs/${job.job_id}/clips` : `/jobs/${job.job_id}`;

  // Lazily derive a poster from the rank-1 clip once the job is done.
  useEffect(() => {
    if (!completed || produced === 0) return;
    let alive = true;
    api
      .getClips(job.job_id)
      .then((r) => {
        const t = r.clips?.[0]?.thumb_url;
        if (alive && t) setThumb(t);
      })
      .catch(() => {/* placeholder stays */});
    return () => {
      alive = false;
    };
  }, [job.job_id, completed, produced]);

  return (
    <Link href={href} className="group block">
      <Card interactive className="flex flex-col overflow-hidden">
        {/* Poster / status surface */}
        <div className="relative aspect-video overflow-hidden bg-ink-950">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-500">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5h16v14H4zM4 9h16M9 5v14" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <span className="absolute right-2 top-2">
            <StatusPill status={job.status} />
          </span>
          {/* Live progress bar for running jobs */}
          {!completed && job.status !== "failed" && (
            <div className="absolute inset-x-0 bottom-0">
              <div className="h-1 bg-ink-800">
                <div className="h-full bg-brand transition-all" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-white">
            {job.title ?? job.job_id}
          </h3>
          <p className="mt-1 text-xs text-ink-400">
            {completed
              ? completedNoClips
                ? "No clips found"
                : `${produced} clip${produced === 1 ? "" : "s"}`
              : `${job.stage} · ${job.progress}%`}
            {" · "}
            {formatRelative(job.created_at)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
