"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

export default function DashboardPage() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-white/60">
            Every video you have turned into clips.
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-600"
        >
          + New clips
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {jobs === null && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-ink-700 bg-ink-900/60"
            />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-900/40 p-12 text-center">
          <p className="text-white/80">No projects yet.</p>
          <Link
            href="/new"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Create your first clips
          </Link>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.job_id}
              href={
                job.status === "completed"
                  ? `/jobs/${job.job_id}/clips`
                  : `/jobs/${job.job_id}`
              }
              className="group rounded-2xl border border-ink-700 bg-ink-900/60 p-5 transition hover:border-brand/60 hover:bg-ink-850"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 font-semibold text-white">
                  {job.title ?? job.job_id}
                </h3>
                <StatusPill status={job.status} />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                {job.clip_count} clips requested · {formatRelative(job.created_at)}
              </p>
              {job.status !== "completed" && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-white/60">
                    {job.stage} · {job.progress}%
                  </p>
                </div>
              )}
              {job.status === "completed" && (
                <p className="mt-4 text-sm text-brand-400 group-hover:text-brand">
                  View {job.clip_count} clips →
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
