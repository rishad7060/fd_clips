"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Opus-style slim icon RAIL: a narrow vertical strip of icon links on the left
 * (desktop). Each item is icon-only with a hover tooltip (the label) and the
 * active route is highlighted with the ONE selected affordance. On small screens
 * the rail is hidden and replaced by a fixed bottom nav bar so mobile is never
 * left without navigation.
 */
const NAV: { href: string; label: string; icon: string; exact?: boolean }[] = [
  // Home (the new dashboard hero)
  { href: "/dashboard", label: "Home", icon: "M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10", exact: true },
  // New clips
  { href: "/new", label: "New clips", icon: "M12 5v14M5 12h14" },
  // Projects — scroll-anchors to the grid on the home page
  { href: "/dashboard#projects", label: "Projects", icon: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
];

// The bottom "?" entry opens the help center.
const HELP_HREF = "/help";
const HELP_LABEL = "Help";
const HELP_ICON = "M9.5 9a2.5 2.5 0 113.5 2.3c-.8.4-1 .8-1 1.7M12 17h.01";

function NavIcon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function isActive(pathname: string, item: { href: string; exact?: boolean }): boolean {
  const base = item.href.split(/[?#]/)[0]!;
  // Anchor links (#projects) never highlight; exact items match only the exact
  // path so Home and Projects don't both light up on /dashboard.
  if (item.href.includes("#")) return false;
  return item.exact ? pathname === base : pathname === base || pathname.startsWith(base + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-white/[0.08] bg-ink-950/70 py-4 md:flex">
        {/* Brand mark — the real Logo glyph, not a hand-set letter. */}
        <Link
          href="/dashboard"
          aria-label="Home"
          className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-cyan-400 shadow-glow transition hover:-translate-y-0.5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
            <path d="M5 4v16l14-8z" />
          </svg>
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`group relative grid h-11 w-11 place-items-center rounded-xl transition duration-200 ease-premium ${
                  active
                    ? "border border-brand bg-brand/10 text-brand-400 ring-1 ring-brand/40"
                    : "text-ink-400 hover:bg-ink-800 hover:text-white"
                }`}
              >
                <NavIcon path={item.icon} />
                {/* hover tooltip */}
                <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-ink-800 px-2 py-1 text-xs text-white shadow ring-1 ring-white/10 group-hover:block">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Help at the bottom — opens the help center. */}
        <Link
          href={HELP_HREF}
          title={HELP_LABEL}
          aria-label={HELP_LABEL}
          className={`group relative grid h-11 w-11 place-items-center rounded-xl transition ${
            pathname === HELP_HREF || pathname.startsWith(HELP_HREF + "/")
              ? "border border-brand bg-brand/10 text-brand-400 ring-1 ring-brand/40"
              : "text-ink-400 hover:bg-ink-800 hover:text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d={HELP_ICON} />
          </svg>
          <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-ink-800 px-2 py-1 text-xs text-white shadow ring-1 ring-white/10 group-hover:block">
            {HELP_LABEL}
          </span>
        </Link>
      </aside>

      {/* Mobile bottom bar — the rail is hidden below md, so give mobile real nav. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/[0.08] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active ? "text-brand-400" : "text-ink-400 hover:text-white"
              }`}
            >
              <NavIcon path={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href={HELP_HREF}
          aria-label={HELP_LABEL}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
            pathname === HELP_HREF || pathname.startsWith(HELP_HREF + "/")
              ? "text-brand-400"
              : "text-ink-400 hover:text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d={HELP_ICON} />
          </svg>
          {HELP_LABEL}
        </Link>
      </nav>
    </>
  );
}
