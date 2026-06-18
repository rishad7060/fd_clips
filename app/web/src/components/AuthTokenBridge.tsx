"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";

/**
 * Bridges Clerk's client-side session token into the module-level api client.
 *
 * The api object is a plain module (no React context), so it can't call
 * useAuth() itself. This tiny client component — mounted ONLY inside the
 * Clerk-enabled branch of the root layout — registers a token getter while
 * mounted and clears it on unmount. In mock/dev mode this component is never
 * rendered, so http() keeps sending no Authorization header.
 */
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => setTokenGetter(null);
  }, [getToken]);

  return null;
}
