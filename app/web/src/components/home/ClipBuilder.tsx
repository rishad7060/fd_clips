"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { STYLE_TEMPLATES, templateById } from "@/lib/templates";
import type { AspectRatio, ClipLength, ClipStyle, CreateJobInput, Genre } from "@/lib/types";
import { DEV_USER } from "@/lib/auth";
import { ConfigPanel } from "@/components/config/ConfigPanel";
import { CaptionPresets } from "@/components/config/CaptionPresets";
import { MyTemplates, type SavedConfig } from "@/components/config/MyTemplates";
import { VideoPreviewCard } from "@/components/config/VideoPreviewCard";
import { Button } from "@/components/ui/Button";
import { Panel, SectionTitle } from "@/components/ui/Card";

/**
 * The home clip builder: a URL/upload box that, ONCE a source is added, reveals
 * the full Opus-style config inline (preview, AI clipping, caption presets, My
 * templates, email, Save-as-default). Until then the page stays a clean hero —
 * config never dumps onto an empty screen. Submitting creates a job and routes
 * to its live-progress page.
 */
const CLIP_COUNT_DEFAULT = 6;

export function ClipBuilder({ onSourceChange }: { onSourceChange?: (has: boolean) => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(DEV_USER.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDefault, setSavedDefault] = useState(false);

  // Config state
  const [clipCount, setClipCount] = useState(CLIP_COUNT_DEFAULT);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [clipLength, setClipLength] = useState<ClipLength>("auto");
  const [genre, setGenre] = useState<Genre>("auto");
  const [includeMoments, setIncludeMoments] = useState("");
  const [autoHook, setAutoHook] = useState(true);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [templateId, setTemplateId] = useState(STYLE_TEMPLATES[0]!.id);
  const [alignment, setAlignment] = useState<NonNullable<ClipStyle["alignment"]>>("bottom");

  // A source counts as "added" once a valid-looking URL or an upload exists.
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(url.trim());
  const hasSource = looksLikeUrl || Boolean(sourceKey);

  useEffect(() => { onSourceChange?.(hasSource); }, [hasSource, onSourceChange]);

  const creditEstimate = range ? Math.max(1, Math.ceil((range.end - range.start) / 60)) : 8;

  // Restore last-used config once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fd:lastConfig");
      if (raw) applyConfig(JSON.parse(raw));
    } catch {/* ignore */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function currentConfig(): SavedConfig {
    return { aspectRatio, clipLength, genre, autoHook, templateId, alignment, clipCount };
  }
  function applyConfig(c: Partial<SavedConfig>) {
    if (c.aspectRatio) setAspectRatio(c.aspectRatio);
    if (c.clipLength) setClipLength(c.clipLength);
    if (c.genre) setGenre(c.genre);
    if (typeof c.autoHook === "boolean") setAutoHook(c.autoHook);
    if (c.templateId) setTemplateId(c.templateId);
    if (c.alignment) setAlignment(c.alignment);
    if (c.clipCount) setClipCount(c.clipCount);
  }

  async function onPickFile(file: File) {
    setUploading(true);
    setError(null);
    setFileName(file.name);
    try {
      const { source_key } = await api.uploadFile(file);
      setSourceKey(source_key);
      setUrl("");
    } catch (e) {
      setError(friendly(e));
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  async function getClips() {
    if (submitting || !hasSource) return;
    setError(null);
    setSubmitting(true);
    try {
      localStorage.setItem("fd:lastConfig", JSON.stringify(currentConfig()));
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      const style: ClipStyle = { ...templateById(templateId).style, alignment, hook_overlay: autoHook };
      const input: CreateJobInput = {
        source_type: sourceKey ? "upload" : "url",
        ...(sourceKey
          ? { source_key: sourceKey, source_filename: fileName ?? undefined }
          : { source_url: url.trim() }),
        clip_count: clipCount,
        style,
        aspect_ratio: aspectRatio,
        clip_length: clipLength,
        genre,
        ...(includeMoments.trim() ? { include_moments: includeMoments.trim() } : {}),
        ...(range ? { process_range: range } : {}),
        ...(emailOk ? { email: email.trim() } : {}),
      };
      const job = await api.createJob(input);
      router.push(`/jobs/${job.job_id}`);
    } catch (e) {
      setError(friendly(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-left">
      {/* Source row */}
      <div className="space-y-3">
        {sourceKey ? (
          <SourceChip label={fileName ?? "Uploaded video"} onRemove={() => { setSourceKey(null); setFileName(null); }} />
        ) : looksLikeUrl ? (
          <SourceChip label={url.trim()} onRemove={() => setUrl("")} />
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-3.5 transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40">
            <LinkIcon />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a video link — YouTube, TikTok, Instagram, X…"
              className="w-full bg-transparent text-sm text-white placeholder:text-ink-400 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ink-300 transition hover:bg-ink-800 hover:text-white disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onPickFile(f);
              }}
            />
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          size="lg"
          full
          loading={submitting}
          onClick={getClips}
          disabled={submitting || !hasSource}
        >
          {submitting ? "Creating clips…" : "Get clips in 1 click"}
        </Button>

        {error && <p className="text-center text-sm text-danger-400">{error}</p>}
      </div>

      {/* Everything below reveals ONLY after a source is added. */}
      {hasSource && (
        <div className="animate-[fadeIn_.25s_ease]">
          {/* Language · credit usage */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-ink-400">
            <span>Speech language: <span className="font-semibold text-white">English</span></span>
            <span className="inline-flex items-center gap-1">
              Credit usage:
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand-400" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
              <span className="font-mono font-semibold tabular-nums text-white">{creditEstimate}</span>
            </span>
          </div>

          {/* Preview */}
          {!sourceKey && (
            <div className="mt-6"><VideoPreviewCard url={url} /></div>
          )}

          {/* AI clipping */}
          <div className="mt-8">
            <ConfigPanel
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              clipLength={clipLength} setClipLength={setClipLength}
              genre={genre} setGenre={setGenre}
              autoHook={autoHook} setAutoHook={setAutoHook}
              includeMoments={includeMoments} setIncludeMoments={setIncludeMoments}
              range={range} setRange={setRange}
              clipCount={clipCount} setClipCount={setClipCount}
            />
          </div>

          {/* Caption presets + My templates */}
          <div className="mt-8 space-y-6">
            <CaptionPresets
              templateId={templateId} setTemplateId={setTemplateId}
              alignment={alignment} setAlignment={setAlignment}
            />
            <MyTemplates current={currentConfig()} onApply={applyConfig} />
          </div>

          {/* Email */}
          <Panel className="mt-8 p-5">
            <SectionTitle className="mb-1">
              Email <span className="text-sm font-normal text-ink-400">(optional)</span>
            </SectionTitle>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white transition placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
            />
            <p className="mt-2 text-xs text-ink-400">
              We&apos;ll open your project right away; add an email to also be notified when clips are ready.
            </p>
          </Panel>

          {/* Save as default */}
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                try {
                  localStorage.setItem("fd:lastConfig", JSON.stringify(currentConfig()));
                  setSavedDefault(true);
                  setTimeout(() => setSavedDefault(false), 2000);
                } catch {/* ignore */}
              }}
            >
              {savedDefault ? "Saved as default ✓" : "Save settings above as default"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-3.5 shadow-rim">
      <LinkIcon />
      <span className="flex-1 truncate text-sm text-ink-100">{label}</span>
      <button type="button" onClick={onRemove} className="text-sm font-medium text-brand-400 underline-offset-2 hover:underline">
        Remove
      </button>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
    </svg>
  );
}

function friendly(e: unknown): string {
  const msg = String(e instanceof Error ? e.message : e);
  if (/413|too large|payload/i.test(msg)) return "That file is too large. Try a shorter clip or a link.";
  return msg.replace(/^Error:\s*/, "");
}
