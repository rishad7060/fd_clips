import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth middleware.
 *
 * In dev/mock mode (no Clerk publishable key) this is a no-op passthrough so
 * every route renders without credentials. When a real Clerk key is present we
 * delegate to Clerk's clerkMiddleware (resolved at request time so the build
 * never requires Clerk env vars). clerkMiddleware returns a handler with the
 * same (req, event) signature as a Next.js middleware.
 */
const CLERK_ENABLED = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "")
  .trim()
  .startsWith("pk_");

export async function middleware(req: NextRequest, event: unknown) {
  if (!CLERK_ENABLED) {
    return NextResponse.next();
  }
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  const handler = clerkMiddleware();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (handler as any)(req, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
