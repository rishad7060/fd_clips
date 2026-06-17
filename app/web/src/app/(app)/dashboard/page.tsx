"use client";

import { useState } from "react";
import { ClipBuilder } from "@/components/home/ClipBuilder";
import { FeatureTiles } from "@/components/home/FeatureTiles";
import { ProjectsGrid } from "@/components/home/ProjectsGrid";

/**
 * Opus-style home: a clean hero with the URL/upload box. The moment a source is
 * added, the full config reveals inline (preview, AI clipping, presets, …) and
 * the feature tiles + projects collapse so the builder has focus — exactly like
 * Opus. With no source, the page is the hero + feature tiles + projects grid.
 */
export default function DashboardPage() {
  const [hasSource, setHasSource] = useState(false);

  return (
    <div className="flex flex-col gap-10 py-10">
      <section className="px-4 text-center">
        <h1 className="mb-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
          FocalDive Clips
        </h1>
        <ClipBuilder onSourceChange={setHasSource} />

        {/* Feature tiles only when the builder is empty (don't clutter config). */}
        {!hasSource && (
          <div className="mt-9">
            <FeatureTiles />
          </div>
        )}
      </section>

      {/* Projects hidden while building so the config screen is uncluttered. */}
      {!hasSource && (
        <>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 sm:px-8">
            <span className="text-xs text-ink-500">0 GB / 100 GB storage</span>
          </div>
          <ProjectsGrid />
        </>
      )}
    </div>
  );
}
