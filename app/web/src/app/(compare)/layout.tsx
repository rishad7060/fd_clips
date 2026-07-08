import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

const FOOTER_LINKS = [
  ["Compare tools", "/compare"],
  ["Free tools", "/tools"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
] as const;

/**
 * Shared chrome for the public comparison / alternatives pages (high-intent
 * "vs" and "best/cheapest" SEO surfaces). Mirrors the (tools) layout: slim
 * ClipsHQ brand bar + a "Make clips - free" CTA, a centered content column, and
 * a cross-linking footer. Lives outside the (app) auth shell so these pages are
 * fully public and indexable.
 */
export default function CompareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Logo href="/" />
          <Link
            href="/new"
            className="rounded-full bg-gradient-to-b from-brand-400 to-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
          >
            Make clips - free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">{children}</main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} ClipsHQ</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FOOTER_LINKS.map(([label, href]) => (
              <Link key={href} href={href} className="transition hover:text-white">
                {label}
              </Link>
            ))}
            <CookiePreferencesLink className="transition hover:text-white">
              Cookie preferences
            </CookiePreferencesLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
