import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

/**
 * Shared chrome for the root-level keyword SEO landing pages (the (seo) group:
 * /best-ai-video-clipper, /arabic-subtitle-generator, /opus-clip-alternative,
 * ...). Mirrors the (compare)/(tools) layouts - slim brand bar + "Try Free"
 * CTA, centered column - but carries a richer SEO footer of internal links
 * (Product / Comparisons / Free tools / Blog) per the site spec. Public and
 * indexable (outside the (app) auth shell).
 */
const FOOTER_GROUPS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["Pricing", "/#pricing"],
      ["Upload video", "/new"],
      ["Free tools", "/tools"],
    ],
  },
  {
    title: "Compare",
    links: [
      ["All comparisons", "/compare"],
      ["ClipsHQ vs Opus Clip", "/compare/clipshq-vs-opus-clip"],
      ["Opus Clip alternative", "/opus-clip-alternative"],
      ["Best AI video clipper", "/best-ai-video-clipper"],
    ],
  },
  {
    title: "Subtitles",
    links: [
      ["Arabic subtitles", "/arabic-subtitle-generator"],
      ["Tamil subtitles", "/tamil-subtitle-generator"],
      ["Urdu subtitles", "/urdu-subtitle-generator"],
      ["Blog", "/blog"],
    ],
  },
];

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Logo href="/" />
          <Link
            href="/new"
            className="rounded-full bg-gradient-to-b from-brand-400 to-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
          >
            Try Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">{children}</main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  {g.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {g.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-ink-300 transition hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pt-6 text-sm text-ink-400 sm:flex-row">
            <span>© {new Date().getFullYear()} ClipsHQ</span>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/terms" className="transition hover:text-white">Terms</Link>
              <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
              <Link href="/accessibility" className="transition hover:text-white">Accessibility</Link>
              <CookiePreferencesLink className="transition hover:text-white">
                Cookie preferences
              </CookiePreferencesLink>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
