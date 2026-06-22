import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED } from "@/lib/auth";

/**
 * Auth middleware (Auth.js v5).
 *
 * In dev/mock mode (NEXT_PUBLIC_AUTH_ENABLED != "true") this is a passthrough so
 * every route renders without credentials — and Auth.js is never imported, so no
 * AUTH_SECRET is required. When auth is enabled, the Auth.js config is loaded at
 * request time and unauthenticated requests to protected routes are redirected
 * to /sign-in. Public routes (landing, /sign-in, /sign-up, /api/auth) stay open.
 */

// Route prefixes that require a signed-in user (the (app) route group; the
// route-group parens don't appear in the URL).
const PROTECTED_PREFIXES = ["/dashboard", "/new", "/jobs", "/billing", "/help"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(req: NextRequest, event: unknown) {
  if (!AUTH_ENABLED) {
    return NextResponse.next();
  }
  // Resolve Auth.js at request time so the build/dev server never requires auth
  // env vars when auth is disabled (mirrors the original optional-auth pattern).
  const { auth } = await import("@/auth");
  const handler = auth((r) => {
    if (!r.auth && isProtected(r.nextUrl.pathname)) {
      const signIn = new URL("/sign-in", r.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", r.nextUrl.pathname);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (handler as any)(req, event);
}

export const config = {
  // Run on everything except Next internals, the Auth.js API, and static files.
  matcher: ["/((?!api/auth|_next|.*\\..*).*)"],
};
