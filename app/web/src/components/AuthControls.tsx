import Link from "next/link";
import { CLERK_ENABLED, DEV_USER } from "@/lib/auth";

/**
 * Renders sign-in / user controls. Uses Clerk components when keys are present,
 * otherwise a static dev-mode avatar so the shell looks complete with no auth.
 */
export async function AuthControls() {
  if (CLERK_ENABLED) {
    const { SignedIn, SignedOut, UserButton, SignInButton } = await import(
      "@clerk/nextjs"
    );
    return (
      <>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </>
    );
  }

  // Dev / mock auth mode.
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-medium text-white">
          {DEV_USER.name}
        </span>
        <span className="block text-xs text-ink-500">dev mode · no Clerk</span>
      </span>
      <span
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-cyan-500 text-sm font-bold text-white"
        title={`${DEV_USER.name} (dev mode)`}
      >
        {DEV_USER.initials}
      </span>
    </div>
  );
}

export function DashboardLink() {
  return (
    <Link
      href="/dashboard"
      className="rounded-lg border border-ink-600 px-4 py-1.5 text-sm font-medium text-white/90 hover:border-brand hover:text-white"
    >
      Open dashboard
    </Link>
  );
}
