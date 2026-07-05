"use client";

import Link from "next/link";
import { useWaitlistMode } from "@/lib/useWaitlistMode";

/**
 * Landing-navbar right-side actions ("Sign in" + "Create clips - free").
 *
 * In pre-launch waitlist mode both are HIDDEN (the product isn't open yet, so
 * there's nothing to sign into or start) - the navbar keeps just the logo + nav
 * links. Until the flag resolves we render the buttons so the launched case
 * never flashes empty.
 */
export function NavCta() {
  const waitlist = useWaitlistMode() === true;
  if (waitlist) return null;

  return (
    <>
      <Link
        href="/dashboard"
        className="hidden rounded-full px-3 py-2 text-sm text-ink-300 transition hover:text-white sm:block"
      >
        Sign in
      </Link>
      <Link
        href="/new"
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition duration-200 ease-premium hover:bg-white/90 active:scale-95"
      >
        Create clips - free
      </Link>
    </>
  );
}
