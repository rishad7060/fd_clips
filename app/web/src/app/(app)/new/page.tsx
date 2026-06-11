"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { STYLE_TEMPLATES, templateById } from "@/lib/templates";
import type { CreateJobInput, SourceType } from "@/lib/types";

export default function NewClipsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SourceType>("url");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [clipCount, setClipCount] = useState(5);
  const [templateId, setTemplateId] = useState("default");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting && (tab === "url" ? url.trim().length > 4 : !!fileName);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const input: CreateJobInput =
        tab === "url"
          ? {
              source_type: "url",
              source_url: url.trim(),
              clip_count: clipCount,
              style: templateById(templateId).style,
            }
          : {
              source_type: "upload",
              // In real mode the file is uploaded to R2 first; mock just needs a name.
              source_key: `org/uploads/${Date.now()}/source.mp4`,
              source_filename: fileName ?? "upload.mp4",
              clip_count: clipCount,
              style: templateById(templateId).style,
            };
      const job = await api.createJob(input);
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
          Paste a video link or upload a file. We will find your best moments.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-6">
        {/* Source tabs */}
        <div className="mb-5 inline-flex rounded-lg border border-ink-700 bg-ink-850 p-1">
          {(["url", "upload"] as SourceType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "bg-brand text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t === "url" ? "Paste URL" : "Upload file"}
            </button>
          ))}
        </div>

        {tab === "url" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              Video URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              YouTube, Vimeo, or any direct video link.
            </p>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-600 bg-ink-950/60 px-6 py-10 text-center transition hover:border-brand">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-ink-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M5 11l7-7 7 7M5 20h14" />
            </svg>
            <span className="mt-3 text-sm font-medium text-white">
              {fileName ?? "Click to choose a video file"}
            </span>
            <span className="mt-1 text-xs text-ink-500">MP4, MOV up to 4 GB</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        )}

        {/* Clip count */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">
              Number of clips
            </label>
            <span className="text-sm font-semibold text-brand-400">
              {clipCount}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={clipCount}
            onChange={(e) => setClipCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Template picker */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-white/80">
            Caption style
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  templateId === t.id
                    ? "border-brand bg-brand/10 ring-1 ring-brand/40"
                    : "border-ink-700 bg-ink-850 hover:border-ink-500"
                }`}
              >
                <span
                  className="block rounded px-2 py-1 text-center text-[11px] font-bold"
                  style={{
                    background: "#000",
                    color: t.style.highlight_color,
                  }}
                >
                  ABC
                </span>
                <span className="mt-2 block text-xs font-medium text-white">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
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
          {submitting ? "Submitting…" : `Generate ${clipCount} clips`}
        </button>
      </div>
    </div>
  );
}
