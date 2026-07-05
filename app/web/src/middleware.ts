import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED } from "@/lib/auth";

/**
 * Auth + waitlist middleware (Auth.js v5).
 *
 * In dev/mock mode (NEXT_PUBLIC_AUTH_ENABLED != "true") the AUTH part is a
 * passthrough so every route renders without credentials - and Auth.js is never
 * imported, so no AUTH_SECRET is required. When auth is enabled, unauthenticated
 * requests to protected routes are redirected to /sign-in.
 *
 * BEFORE any auth logic, a WAITLIST gate runs regardless of auth mode: while the
 * admin has "waitlist mode" on, the product isn't open, so every app + auth route
 * (/new, /sign-in, /sign-up, /dashboard, /jobs, /billing, /clips) is bounced back
 * to the landing page. This stops indirect entry points (e.g. Pricing's "Get
 * started" → /new → /sign-in) from reaching sign-in / clip-creation pre-launch.
 * The admin console stays reachable so operators can still log in and flip it off.
 */

// Route prefixes that require a signed-in user (the (app) route group; the
// route-group parens don't appear in the URL).
const PROTECTED_PREFIXES = ["/dashboard", "/new", "/jobs", "/billing", "/help"];
// Admin routes require a signed-in user whose role is "admin".
const ADMIN_PREFIX = "/admin";
// The admin login page itself must stay open.
const ADMIN_SIGN_IN = "/admin/sign-in";

// Routes that are closed to visitors while waitlist mode is on. Everything the
// pre-launch site should NOT expose: the app itself + the auth pages that lead
// into it. Admin (/admin*) and public pages (landing, /tools, legal) are omitted
// so operators can log in and marketing/SEO pages stay live.
const WAITLIST_BLOCKED_PREFIXES = [
  "/new",
  "/sign-in",
  "/sign-up",
  "/dashboard",
  "/jobs",
  "/billing",
  "/clips",
];

function hasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtected(pathname: string): boolean {
  return hasPrefix(pathname, PROTECTED_PREFIXES);
}

function isAdminRoute(pathname: string): boolean {
  return (
    (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) &&
    pathname !== ADMIN_SIGN_IN
  );
}

// Server-side read of the public waitlist flag, cached briefly so we don't fetch
// /platform/status on every navigation. Reachable via API_INTERNAL_URL inside
// the compose network (falls back to the public URL for local runs).
const API_URL =
  process.env.API_INTERNAL_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:4000";
const WAITLIST_TTL_MS = 30_000;
let waitlistCache: { value: boolean; at: number } | null = null;

async function isWaitlistMode(): Promise<boolean> {
  const now = Date.now();
  if (waitlistCache && now - waitlistCache.at < WAITLIST_TTL_MS) {
    return waitlistCache.value;
  }
  try {
    const res = await fetch(`${API_URL}/platform/status`, { cache: "no-store" });
    const value = res.ok ? !!(await res.json()).waitlistMode : false;
    waitlistCache = { value, at: now };
    return value;
  } catch {
    // On any failure, fail OPEN (don't lock people out of a launched product).
    waitlistCache = { value: false, at: now };
    return false;
  }
}

export async function middleware(req: NextRequest, event: unknown) {
  // ── Waitlist gate (runs in every auth mode, before auth logic) ────────────
  const path = req.nextUrl.pathname;
  if (hasPrefix(path, WAITLIST_BLOCKED_PREFIXES) && (await isWaitlistMode())) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (!AUTH_ENABLED) {
    return NextResponse.next();
  }
  // Resolve Auth.js at request time so the build/dev server never requires auth
  // env vars when auth is disabled (mirrors the original optional-auth pattern).
  const { auth } = await import("@/auth");
  const handler = auth((r) => {
    const path = r.nextUrl.pathname;
    // Admin routes: require an authenticated admin; otherwise to /admin/sign-in.
    if (isAdminRoute(path)) {
      if (!r.auth || r.auth.role !== "admin") {
        const signIn = new URL(ADMIN_SIGN_IN, r.nextUrl.origin);
        signIn.searchParams.set("callbackUrl", path);
        return NextResponse.redirect(signIn);
      }
      return NextResponse.next();
    }
    if (!r.auth && isProtected(path)) {
      const signIn = new URL("/sign-in", r.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", path);
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
