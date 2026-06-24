import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

const LEGAL_LINKS = [
  ["Terms of Service", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Accessibility", "/accessibility"],
] as const;

/**
 * Shared chrome for the public legal pages (terms / privacy / accessibility):
 * a slim top bar with the brand mark, a centred prose column, and a footer that
 * cross-links the policies. Lives outside the (app) auth shell so it's public.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <Logo href="/" />
          <Link
            href="/"
            className="text-sm text-ink-300 transition hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">{children}</main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Clips</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(([label, href]) => (
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
