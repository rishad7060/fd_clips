"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { REF_COOKIE } from "@/components/ReferralCapture";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Attributes the authenticated org to the referral code held in the `fd_ref`
 * cookie, then clears it so attribution happens at most once. Mounted in the
 * authenticated (app) layout, so it runs after ANY sign-in method (Google or
 * email) - satisfying the "works for both signup paths" requirement. The cookie
 * is cleared only on a resolved response (a transient failure is retried on the
 * next mount). Renders nothing.
 */
export function ReferralAttribute() {
  useEffect(() => {
    const code = readCookie(REF_COOKIE);
    if (!code) return;
    api
      .attributeReferral(code)
      .then(() => clearCookie(REF_COOKIE))
      .catch(() => {
        /* keep the cookie so a later mount can retry */
      });
  }, []);
  return null;
}
