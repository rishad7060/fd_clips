"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { USING_MOCK_API } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Projects", icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/new", label: "New clips", icon: "M12 5v14M5 12h14" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-950/60 px-3 py-4 md:flex">
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand/15 text-white ring-1 ring-brand/40"
                  : "text-white/70 hover:bg-ink-850 hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-ink-700 bg-ink-900/70 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white/80">Credits</span>
          <span className="text-brand-400">24 / 30 min</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full w-4/5 rounded-full bg-brand" />
        </div>
        <p className="mt-3 text-ink-500">
          {USING_MOCK_API ? "Mock API · offline data" : "Live API connected"}
        </p>
      </div>
    </aside>
  );
}
