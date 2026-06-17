"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Opus-style slim icon RAIL: a narrow vertical strip of icon links on the left.
 * Each item is icon-only with a hover tooltip (the label). The active route is
 * highlighted. Collapses to a bottom bar concept is out of scope — on small
 * screens it stays a thin rail.
 */
const NAV: { href: string; label: string; icon: string; exact?: boolean }[] = [
  // Home (the new dashboard hero)
  { href: "/dashboard", label: "Home", icon: "M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10", exact: true },
  // New clips
  { href: "/new", label: "New clips", icon: "M12 5v14M5 12h14" },
  // Projects — scroll-anchors to the grid on the home page
  { href: "/dashboard#projects", label: "Projects", icon: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-ink-800 bg-ink-950/70 py-4 md:flex">
      {/* Brand mark */}
      <Link
        href="/dashboard"
        aria-label="Home"
        className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand text-ink-950 shadow-glow"
      >
        <span className="text-lg font-black">F</span>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {NAV.map((item) => {
          const base = item.href.split(/[?#]/)[0];
          // Anchor links (#projects) never highlight; exact items match only the
          // exact path so Home and Projects don't both light up on /dashboard.
          const isAnchor = item.href.includes("#");
          const active = isAnchor
            ? false
            : item.exact
              ? pathname === base
              : pathname === base || pathname.startsWith(base + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`group relative grid h-11 w-11 place-items-center rounded-xl transition ${
                active
                  ? "bg-brand/15 text-brand-400 ring-1 ring-brand/40"
                  : "text-white/60 hover:bg-ink-850 hover:text-white"
              }`}
            >
              <NavIcon path={item.icon} />
              {/* hover tooltip */}
              <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-ink-800 px-2 py-1 text-xs text-white shadow ring-1 ring-ink-700 group-hover:block">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Help at the bottom */}
      <Link
        href="/dashboard"
        title="Help"
        aria-label="Help"
        className="grid h-11 w-11 place-items-center rounded-xl text-white/50 hover:bg-ink-850 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 113.5 2.3c-.8.4-1 .8-1 1.7M12 17h.01" />
        </svg>
      </Link>
    </aside>
  );
}
