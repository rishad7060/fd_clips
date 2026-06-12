"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  STYLE_TEMPLATES,
  ALIGNMENT_OPTIONS,
  FONT_SIZE_OPTIONS,
  templateById,
} from "@/lib/templates";
import type { ClipStyle, CreateJobInput } from "@/lib/types";
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
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Caption look: template (default Hype/Hormozi) + placement + size.
  const [templateId, setTemplateId] = useState<string>(STYLE_TEMPLATES[0]!.id);
  // Default to BOTTOM placement (safest for faces; user can change).
  const [alignment, setAlignment] =
    useState<NonNullable<ClipStyle["alignment"]>>("bottom");
  const [fontSize, setFontSize] = useState<number>(0); // 0 = template default

  // Email is OPTIONAL now — submitting goes straight to the live project view;
  // an email is only attached (for the optional Resend notification) if valid.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !submitting && url.trim().length > 4;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      // User-chosen caption template + placement + (optional) size override.
      const style: ClipStyle = { ...templateById(templateId).style, alignment };
      if (fontSize > 0) style.font_size = fontSize;
      const input: CreateJobInput = {
        source_type: "url",
        source_url: url.trim(),
        clip_count: MVP_CLIP_COUNT,
        style,
        // Only attach the email if it's valid — it's an optional notification.
        ...(emailOk ? { email: email.trim() } : {}),
      };
      const job = await api.createJob(input);
      // Go straight to the project: the progress page shows live status and
      // auto-opens the clips gallery when the job completes (no email-wait
      // screen, no landing on an empty /clips before the job has finished).
      router.push(`/jobs/${job.job_id}`);
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create clips</h1>
        <p className="text-sm text-white/60">
          Paste a YouTube link and we&apos;ll turn it into your{" "}
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

        {/* Delivery email (optional) */}
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            Email <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            We&apos;ll open your project right away. Add an email to also get
            notified when the clips are ready.
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

        {/* Caption style picker */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-white/80">
            Caption style
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLE_TEMPLATES.map((t) => {
              const active = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  title={t.description}
                  className={`rounded-lg border p-2 text-left transition ${
                    active
                      ? "border-brand ring-1 ring-brand"
                      : "border-ink-600 hover:border-ink-500"
                  }`}
                >
                  <div
                    className={`grid h-12 place-items-center rounded ${t.previewClass}`}
                  >
                    <span className="text-[11px] leading-none">
                      Aa<span style={{ color: t.style.highlight_color }}>Bb</span>
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium text-white/80">
                    {t.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Caption placement */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-white/80">
            Caption position
          </label>
          <div className="inline-flex rounded-lg border border-ink-600 bg-ink-950 p-1">
            {ALIGNMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAlignment(opt.id)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                  alignment === opt.id
                    ? "bg-brand text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Caption size */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-white/80">
            Caption size
          </label>
          <div className="inline-flex rounded-lg border border-ink-600 bg-ink-950 p-1">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setFontSize(opt.value)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                  fontSize === opt.value
                    ? "bg-brand text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            Big text auto-shrinks per line so it never runs off the edges.
          </p>
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
