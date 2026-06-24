"use client";

import { useState } from "react";
import { Sparkles, Link2, Wand2, Film } from "lucide-react";
import { ClipBuilder } from "@/components/home/ClipBuilder";

const PLATFORMS = [
  { label: "YouTube", icon: "/brands/youtube.png" },
  { label: "TikTok", icon: "/brands/tiktok.png" },
  { label: "Reels", icon: "/brands/reels.png" },
  { label: "Shorts", icon: "/brands/shorts.png" },
  { label: "Podcasts", icon: "/brands/podcasts.png" },
  { label: "LinkedIn", icon: "/brands/linkedin.png" },
];

const STEPS = [
  {
    Icon: Link2,
    title: "Paste a link or upload",
    desc: "Drop a YouTube, TikTok, Instagram, or X link — or upload your own file.",
  },
  {
    Icon: Wand2,
    title: "AI finds the best moments",
    desc: "We transcribe, score virality, and pick the strongest hooks automatically.",
  },
  {
    Icon: Film,
    title: "Get ranked vertical clips",
    desc: "Captioned, reframed 9:16 shorts — ready to post, emailed in ~30 minutes.",
  },
];

/**
 * The "/new" project starter. The ClipBuilder is the centerpiece (it reveals the
 * full config inline once a source is added). Until then, a hero + supported
 * platforms + a how-it-works trio fill the page so it reads intentional, not
 * empty. All of that supporting content fades out the moment a source is added,
 * keeping the configured state clean.
 */
export function NewClipsView({ initialUrl }: { initialUrl?: string }) {
  const [hasSource, setHasSource] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-850 px-3 py-1 text-xs font-medium text-ink-300 shadow-rim">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" strokeWidth={1.8} aria-hidden />
          AI shorts in ~30 minutes
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Create clips
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-ink-300 sm:text-base">
          Paste a video link or upload a file. Our AI finds your most viral
          moments and returns ranked, captioned, vertical clips.
        </p>
      </div>

      {/* Builder (self-constrains to max-w-2xl; reveals config once a source is added) */}
      <div className="mt-8">
        <ClipBuilder initialUrl={initialUrl ?? ""} onSourceChange={setHasSource} />
      </div>

      {/* Supporting content - only before a source is staged */}
      {!hasSource && (
        <div className="animate-[fadeIn_.3s_ease]">
          {/* Supported platforms */}
          <div className="mt-12">
            <p className="text-center text-[11px] uppercase tracking-[0.18em] text-ink-500">
              Works with
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-semibold text-ink-400">
              {PLATFORMS.map((p) => (
                <span
                  key={p.label}
                  className="group inline-flex items-center gap-2 transition hover:text-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.icon}
                    alt=""
                    aria-hidden
                    className="h-5 w-5 opacity-80 transition group-hover:opacity-100"
                  />
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim transition hover:border-white/15 hover:bg-ink-800"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand-300">
                    <s.Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink-500">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
