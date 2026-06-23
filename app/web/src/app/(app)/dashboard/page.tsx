"use client";

import { useState } from "react";
import { ClipBuilder } from "@/components/home/ClipBuilder";
import { FeatureTiles } from "@/components/home/FeatureTiles";
import { ProjectsGrid } from "@/components/home/ProjectsGrid";

/**
 * Opus-style home: a clean hero with the URL/upload box. The moment a source is
 * added, the full config reveals inline (preview, AI clipping, presets, …) and
 * the feature tiles + projects collapse so the builder has focus - exactly like
 * Opus. With no source, the page is the hero + feature tiles + projects grid.
 */
export default function DashboardPage() {
  const [hasSource, setHasSource] = useState(false);

  return (
    <div className="flex flex-col gap-12 py-12 pb-24 md:pb-12">
      <section className="px-4 text-center">
        {/* Hero - bigger display heading + one-line value prop. */}
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-850 px-3 py-1 text-xs font-medium text-ink-300 shadow-rim">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          AI clips, captions &amp; reframing
        </p>
        <h1 className="mx-auto mb-3 max-w-3xl text-balance text-4xl font-bold tracking-tighter text-white sm:text-5xl">
          Turn any long video into ready-to-post shorts
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-pretty text-sm text-ink-300 sm:text-base">
          Paste a link or upload a file - get ranked, captioned, vertical clips in one click.
        </p>

        <ClipBuilder onSourceChange={setHasSource} />

        {/* Feature tiles only when the builder is empty (don't clutter config). */}
        {!hasSource && (
          <div className="mt-12 animate-[fadeIn_.3s_ease]">
            <FeatureTiles />
          </div>
        )}
      </section>

      {/* Projects hidden while building so the config screen is uncluttered. */}
      {!hasSource && (
        <div className="animate-[fadeIn_.3s_ease]">
          <ProjectsGrid />
        </div>
      )}
    </div>
  );
}
