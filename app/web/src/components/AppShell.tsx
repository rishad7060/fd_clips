import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { AuthControls } from "@/components/AuthControls";
import { Sidebar } from "@/components/Sidebar";

/**
 * Dashboard shell: top bar + sidebar + content area. Async because it awaits
 * AuthControls (which dynamically imports Clerk only when enabled).
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const authControls = await AuthControls();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/80 px-4 py-3 backdrop-blur sm:px-6">
        <Logo href="/dashboard" />
        {authControls}
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
