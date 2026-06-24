"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { hasConsent, onConsentChange } from "@/lib/consent";

/** Cookie that carries a referral code from the landing visit to post-signup. */
export const REF_COOKIE = "fd_ref";
const NINETY_DAYS = 90 * 24 * 60 * 60;

/**
 * Captures a `?ref=CODE` on any page: persists it in the `fd_ref` cookie (90d),
 * registers a click, then strips the param from the URL so a refresh doesn't
 * re-count it. Mounted once in the root layout. The actual attribution happens
 * later (post-auth) in <ReferralAttribute/>. Renders nothing.
 *
 * The `fd_ref` cookie is marketing attribution, not strictly necessary, so we
 * only write it once the visitor has granted **marketing** consent. If they
 * haven't decided yet we hold the code in memory (leaving the URL param intact
 * so a refresh keeps it) and apply it the moment consent is granted - so a
 * consenting user's referral is never lost, and a non-consenting one is never
 * tracked.
 */
export function ReferralCapture() {
  useEffect(() => {
    let ref: string | null = null;
    try {
      ref = new URLSearchParams(window.location.search).get("ref");
    } catch {
      return;
    }
    if (!ref) return;

    const apply = () => {
      try {
        document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref!)}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax`;
        // Best-effort funnel click; never block the page on it.
        api.trackAffiliateClick(ref!).catch(() => {});
        const params = new URLSearchParams(window.location.search);
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
    };

    if (hasConsent("marketing")) {
      apply();
      return;
    }
    // Defer until marketing consent is granted; clean up the listener on apply.
    const off = onConsentChange((state) => {
      if (state.marketing) {
        apply();
        off();
      }
    });
    return off;
  }, []);
  return null;
}
