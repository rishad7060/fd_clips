import type { ReactNode } from "react";
import { AuthControls } from "@/components/AuthControls";
import { Sidebar } from "@/components/Sidebar";
import { CreditsChip } from "@/components/CreditsChip";

/**
 * App shell, Opus-style: a slim icon RAIL on the left + a top bar (credits chip,
 * add-credits, user controls) + the content area. Async because it awaits
 * AuthControls (which dynamically imports Clerk only when enabled).
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const authControls = await AuthControls();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-ink-800 bg-ink-950/80 px-4 py-2.5 backdrop-blur sm:px-6">
          <CreditsChip />
          {authControls}
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
