"use client";

import { useEffect, useRef } from "react";
import { useSession, getSession } from "next-auth/react";
import { setTokenGetter } from "@/lib/api";

/**
 * Bridges the Auth.js session's API token into the module-level api client.
 *
 * The api object is a plain module (no React context), so it can't read the
 * session itself. This tiny client component - mounted ONLY inside the
 * auth-enabled branch of the root layout - registers a getter that returns the
 * current session's `apiToken` (minted server-side in the session callback).
 *
 * Resolution is LIVE, not a snapshot: we keep the latest token in a ref (updated
 * each render by useSession), and the getter returns it. If a request fires
 * before the session has hydrated (the ref is still null - e.g. the dashboard's
 * projects poll runs on first paint), the getter falls back to a one-shot
 * getSession() so that early call still carries a Bearer token instead of 401ing.
 *
 * In mock/dev mode this component is never rendered, so http() keeps sending no
 * Authorization header.
 */
export function AuthTokenBridge() {
  const { data: session } = useSession();
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = session?.apiToken ?? null;

  useEffect(() => {
    setTokenGetter(async () => {
      if (tokenRef.current) return tokenRef.current;
      // Session not hydrated yet - fetch it live so the early request still
      // authenticates rather than going out with no token.
      const s = await getSession();
      return s?.apiToken ?? null;
    });
    return () => setTokenGetter(null);
  }, []);

  return null;
}
