"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/** Cookie that carries a referral code from the landing visit to post-signup. */
export const REF_COOKIE = "fd_ref";
const NINETY_DAYS = 90 * 24 * 60 * 60;

/**
 * Captures a `?ref=CODE` on any page: persists it in the `fd_ref` cookie (90d),
 * registers a click, then strips the param from the URL so a refresh doesn't
 * re-count it. Mounted once in the root layout. The actual attribution happens
 * later (post-auth) in <ReferralAttribute/>. Renders nothing.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref)}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax`;
      // Best-effort funnel click; never block the page on it.
      api.trackAffiliateClick(ref).catch(() => {});
      params.delete("ref");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
      );
    } catch {
      /* ignore - referral capture is best-effort */
    }
  }, []);
  return null;
}
