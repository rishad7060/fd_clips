"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

/**
 * Opus-style projects grid below the hero. Each project is a card with a poster
 * thumbnail (derived from the rank-1 clip when completed), title, status and
 * clip count. Clicking opens the gallery (completed) or live progress (running).
 */
export function ProjectsGrid() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listJobs()
      .then((j) => alive && setJobs(j))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 sm:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          All projects{jobs ? ` (${jobs.length})` : ""}
        </h2>
        <Link href="/new" className="text-sm font-medium text-brand-400 hover:text-brand">
          + New clips
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {jobs === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl border border-ink-700 bg-ink-900/60" />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-900/40 p-12 text-center">
          <p className="text-white/80">No projects yet — paste a link above to make your first clips.</p>
        </div>
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
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 transition hover:border-brand/50"
    >
      {/* Poster / status surface */}
      <div className="relative aspect-video overflow-hidden bg-ink-950">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-600">
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
        <p className="mt-1 text-xs text-ink-500">
          {completed
            ? completedNoClips
              ? "No clips found"
              : `${produced} clip${produced === 1 ? "" : "s"}`
            : `${job.stage} · ${job.progress}%`}
          {" · "}
          {formatRelative(job.created_at)}
        </p>
      </div>
    </Link>
  );
}
