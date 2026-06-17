import { HeroInput } from "@/components/home/HeroInput";
import { FeatureTiles } from "@/components/home/FeatureTiles";
import { ProjectsGrid } from "@/components/home/ProjectsGrid";

/**
 * Opus-style home: a centered hero (brand + URL/upload box + Get-clips button),
 * a row of working-feature tiles, then the projects grid. The shell (AppShell)
 * provides the slim icon rail + top bar with credits.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10 py-10">
      {/* Hero */}
      <section className="px-4 text-center">
        <h1 className="mb-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
          FocalDive Clips
        </h1>
        <HeroInput />
        <div className="mt-9">
          <FeatureTiles />
        </div>
      </section>

      {/* Storage line (static per MVP) */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 sm:px-8">
        <span className="text-xs text-ink-500">0 GB / 100 GB storage</span>
      </div>

      {/* Projects */}
      <ProjectsGrid />
    </div>
  );
}
