"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { templateById } from "@/lib/templates";
import type { CreateJobInput, Job } from "@/lib/types";
import { DEV_USER } from "@/lib/auth";

/**
 * v2 MVP submit form (fd_clips_v2.md Prompt 6).
 *
 * The MVP flow is intentionally narrow: paste a YouTube URL + an email, submit,
 * and see a confirmation ("your 3 clips arrive by email in ~30 min"). We do NOT
 * route into the live editor/progress flow on submit — that matches the MVP
 * promise of an async, emailed delivery.
 *
 * PHASE 2 (see fd_clips_v2.md Part 1 / Part 5):
 *   - File UPLOAD source is cut from the MVP (YouTube URL only = no storage cost,
 *     no big-file handling). The CreateJobInput "upload" branch + R2 staging are
 *     preserved in the types/API for when uploads are turned back on.
 *   - Caption STYLE templates picker is cut from the MVP UI (one clean style
 *     ships by default). templateById("default") is sent so the contract shape
 *     is unchanged; re-expose STYLE_TEMPLATES here to bring the picker back.
 *   - Clip COUNT is fixed at 3 for the MVP. The Phase-2 range is 5–10; raise the
 *     slider max below and re-enable the control when that ships.
 */

// MVP clip count: top 3 only (fd_clips_v2.md Part 1). PHASE 2: 5–10 ranked clips.
const MVP_CLIP_COUNT = 3;

export default function NewClipsPage() {
  const [url, setUrl] = useState("");
  // Prefill with the dev-mode user's email; with real Clerk wired the user can
  // still override the delivery address.
  const [email, setEmail] = useState(DEV_USER.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Job | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !submitting && url.trim().length > 4 && emailOk;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const input: CreateJobInput = {
        source_type: "url",
        source_url: url.trim(),
        clip_count: MVP_CLIP_COUNT,
        // One clean default caption style ships in the MVP (Phase-2 = picker).
        style: templateById("default").style,
        email: email.trim(),
      };
      const job = await api.createJob(input);
      // MVP: show the "arriving by email" confirmation instead of opening the
      // progress/editor flow. The job still runs server-side and lands on /clips.
      setSubmitted(job);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-bold text-white">
            You&apos;re all set
          </h1>
          <p className="mx-auto mt-3 max-w-md text-white/70">
            Your {MVP_CLIP_COUNT} clips will arrive by email in ~30 minutes. We
            sent the confirmation to{" "}
            <span className="font-medium text-white">{email.trim()}</span>.
          </p>
          <p className="mt-2 font-mono text-xs text-ink-500">
            Job {submitted.job_id}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/jobs/${submitted.job_id}/clips`}
              className="w-full rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white shadow-glow hover:bg-brand-600 sm:w-auto"
            >
              View results page
            </Link>
            <button
              onClick={() => {
                setSubmitted(null);
                setUrl("");
              }}
              className="w-full rounded-xl border border-ink-600 px-6 py-3 text-center text-sm font-medium text-white/80 hover:border-brand hover:text-white sm:w-auto"
            >
              Submit another video
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create clips</h1>
        <p className="text-sm text-white/60">
          Paste a YouTube link and we&apos;ll email you your{" "}
          {MVP_CLIP_COUNT} best moments as captioned vertical clips.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-6">
        {/* YouTube URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            YouTube URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Single-speaker / talking-head videos work best in the MVP.
          </p>
        </div>

        {/* Delivery email */}
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            Email for delivery
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            We&apos;ll send your finished clips here in ~30 minutes.
          </p>
        </div>

        {/* Clip count — fixed at 3 for the MVP. */}
        <div className="mt-6 flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white/80">Number of clips</p>
            <p className="text-xs text-ink-500">
              The MVP delivers your top 3 moments.
            </p>
          </div>
          <span className="text-lg font-bold text-brand-400">
            {MVP_CLIP_COUNT}
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          disabled={!canSubmit}
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Submitting…" : `Generate ${MVP_CLIP_COUNT} clips`}
        </button>
      </div>
    </div>
  );
}
