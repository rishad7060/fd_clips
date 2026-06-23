import type { ReactNode } from "react";
import { AuthControls } from "@/components/AuthControls";
import { Sidebar } from "@/components/Sidebar";
import { CreditsChip } from "@/components/CreditsChip";
import { Logo } from "@/components/Logo";

/**
 * App shell, Opus-style: a slim icon RAIL on the left + a top bar (brand mark,
 * credits chip, add-credits, user controls) + the content area. Async because it
 * awaits AuthControls (which dynamically imports Clerk only when enabled).
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const authControls = await AuthControls();
  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-ink-950/80 px-4 py-2.5 backdrop-blur sm:px-6">
          {/* Left: brand mark - visible on mobile (where the rail is hidden) and as a header anchor on desktop. */}
          <Logo href="/dashboard" />
          <div className="flex items-center gap-3">
            <CreditsChip />
            {authControls}
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
