"use client";

import Link from "next/link";
import { useWaitlistMode } from "@/lib/useWaitlistMode";
import { WaitlistForm } from "@/components/home/WaitlistForm";

/**
 * Hero call-to-action, driven by the admin "waitlist mode" platform control.
 *
 *  - Waitlist mode OFF (default / normal launch): the usual dual CTAs
 *    ("Watch demo" + "Get started - free").
 *  - Waitlist mode ON (pre-launch): the CTAs are swapped for an email-capture
 *    WaitlistForm and pre-launch copy.
 *
 * The flag comes from the shared useWaitlistMode() hook (public
 * /platform/status). Until it resolves we render the normal CTAs, so the common
 * (launched) case never flashes empty; on failure we also stay on the CTAs.
 */
export function HeroCta() {
  const waitlist = useWaitlistMode() === true;

  if (waitlist) {
    return (
      <div>
        <WaitlistForm source="landing-hero" />
        <p className="mt-3 text-xs text-ink-500">
          Launching soon · join the waitlist for early access
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Dual CTAs - ghost "Watch demo" + brand "Get started" w/ arrow circle */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#how"
          className="rounded-full border border-white/15 bg-ink-900/60 px-6 py-3 text-sm font-semibold text-ink-100 transition duration-200 ease-premium hover:border-white/30 hover:bg-ink-800 active:scale-95"
        >
          Watch demo
        </a>
        <Link
          href="/new"
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand to-brand-600 active:scale-95"
        >
          Get started - free
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        2 free videos · no credit card · clips by email in ~30 min
      </p>
    </div>
  );
}
