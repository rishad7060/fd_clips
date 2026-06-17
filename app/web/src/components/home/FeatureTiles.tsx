import Link from "next/link";

/**
 * Opus-style feature-tile row. MVP shows ONLY features we actually ship, so
 * every tile leads somewhere real (no dead buttons). Each is a rounded icon over
 * a label; the whole tile is a link.
 */
type Tile = {
  label: string;
  href: string;
  badge?: string;
  icon: React.ReactNode;
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const TILES: Tile[] = [
  {
    label: "Long to shorts",
    href: "/new",
    icon: <Icon path="M12 3l2.5 5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z" />,
  },
  {
    label: "AI Captions",
    href: "/new",
    icon: <Icon path="M4 5h16v14H4zM7 10h4M7 14h7M14 10h3" />,
  },
  {
    label: "AI Reframe",
    href: "/new",
    icon: <Icon path="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6" />,
  },
  {
    label: "AI Hook",
    href: "/new",
    icon: <Icon path="M5 11h14M5 11a4 4 0 014-4h6a4 4 0 014 4M9 7V5m6 2V5M9 15v2m6-2v2" />,
  },
  {
    label: "Video editor",
    href: "/dashboard#projects",
    badge: "Edit clips",
    icon: <Icon path="M9 7l-5 5 5 5M15 7l5 5-5 5" />,
  },
];

export function FeatureTiles() {
  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-x-6 gap-y-6 sm:gap-x-8">
      {TILES.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="group flex w-24 flex-col items-center gap-2.5 text-center"
        >
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink-850 text-ink-200 shadow-rim transition duration-200 ease-premium group-hover:-translate-y-0.5 group-hover:border-white/15 group-hover:bg-ink-800 group-hover:text-brand-400 group-hover:shadow-lift">
            {t.icon}
            {t.badge && (
              <span className="absolute -right-2 -top-2 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-glow">
                New
              </span>
            )}
          </span>
          <span className="text-xs font-medium leading-tight text-ink-300 transition group-hover:text-white">
            {t.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
