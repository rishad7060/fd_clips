"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/**
 * Mobile navigation for the landing header. The desktop nav shows centered
 * links inline; below `md` those links are hidden, so without this the mobile
 * header had no way to reach Features/Pricing/Compare/Solutions/Resources.
 *
 * Renders a hamburger button (md:hidden) that opens a full-screen overlay menu
 * with the primary links plus the Solutions and Resources groups and a CTA.
 * Body scroll is locked while open; Escape and any link click close it.
 */
const PRIMARY: [string, string][] = [
  ["Features", "/#features"],
  ["How it works", "/#how"],
  ["Pricing", "/#pricing"],
  ["Compare", "/compare"],
  ["Free Tools", "/tools"],
  ["Blog", "/blog"],
];

const SOLUTIONS: [string, string][] = [
  ["AI shorts generator", "/ai-shorts-generator"],
  ["YouTube Shorts maker", "/youtube-shorts-maker"],
  ["Instagram Reel generator", "/instagram-reel-generator"],
  ["TikTok clip generator", "/tiktok-clip-generator"],
  ["Podcast clip generator", "/podcast-clip-generator"],
  ["Arabic subtitles", "/arabic-subtitle-generator"],
];

const RESOURCES: [string, string][] = [
  ["Opus Clip alternative", "/opus-clip-alternative"],
  ["Best AI video clipper", "/best-ai-video-clipper"],
  ["All comparisons", "/compare"],
  ["Help center", "/help"],
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full text-ink-200 transition hover:bg-white/5 hover:text-white active:scale-95"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-ink-950/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <span className="text-sm font-semibold text-white">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full text-ink-200 transition hover:bg-white/5 hover:text-white active:scale-95"
            >
              <X className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 pb-10">
            <ul className="space-y-1">
              {PRIMARY.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-3 text-2xl font-medium tracking-tight text-white transition hover:text-brand-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <MenuGroup title="Solutions" links={SOLUTIONS} onNavigate={() => setOpen(false)} />
            <MenuGroup title="Resources" links={RESOURCES} onNavigate={() => setOpen(false)} />

            <Link
              href="/new"
              onClick={() => setOpen(false)}
              className="mt-8 flex items-center justify-center rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-95"
            >
              Try Free
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function MenuGroup({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: [string, string][];
  onNavigate: () => void;
}) {
  return (
    <div className="mt-8">
      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">{title}</p>
      <ul className="mt-2 space-y-0.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className="block rounded-lg px-2 py-2 text-sm text-ink-300 transition hover:text-white"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
