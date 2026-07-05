"use client";

import { useEffect, useState } from "react";
import { getPlatformStatus } from "@/lib/platformStatus";

/**
 * Shared client hook for the public "waitlist mode" flag. Several landing-page
 * pieces (hero CTA, navbar buttons, sticky bar) branch on it, so the platform
 * status is fetched ONCE per page load and memoized module-side - subsequent
 * hook callers reuse the in-flight promise / cached value instead of each
 * hitting /platform/status.
 *
 * Returns `null` while loading (callers render their default/launched state so
 * the common case never flashes), then `true`/`false`.
 */
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function fetchOnce(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = getPlatformStatus()
    .then((s) => {
      cached = !!s.waitlistMode;
      return cached;
    })
    .catch(() => {
      cached = false;
      return false;
    });
  return inflight;
}

export function useWaitlistMode(): boolean | null {
  const [mode, setMode] = useState<boolean | null>(cached);

  useEffect(() => {
    if (cached !== null) {
      setMode(cached);
      return;
    }
    let active = true;
    fetchOnce().then((v) => active && setMode(v));
    return () => {
      active = false;
    };
  }, []);

  return mode;
}
