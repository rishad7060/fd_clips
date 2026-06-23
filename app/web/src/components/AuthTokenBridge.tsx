"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { setTokenGetter } from "@/lib/api";

/**
 * Bridges the Auth.js session's API token into the module-level api client.
 *
 * The api object is a plain module (no React context), so it can't read the
 * session itself. This tiny client component - mounted ONLY inside the
 * auth-enabled branch of the root layout - registers a getter that returns the
 * current session's `apiToken` (minted server-side in the session callback). In
 * mock/dev mode this component is never rendered, so http() keeps sending no
 * Authorization header.
 */
export function AuthTokenBridge() {
  const { data: session } = useSession();
  const apiToken = session?.apiToken ?? null;

  useEffect(() => {
    setTokenGetter(async () => apiToken);
    return () => setTokenGetter(null);
  }, [apiToken]);

  return null;
}
