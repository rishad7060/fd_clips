import Link from "next/link";
import { AUTH_ENABLED, DEV_USER } from "@/lib/auth";
import { SessionControls } from "@/components/SessionControls";

/**
 * Renders sign-in / user controls. Uses the Auth.js session (Google OAuth) when
 * enabled, otherwise a static dev-mode avatar so the shell looks complete with
 * no auth configured.
 */
export async function AuthControls() {
  if (AUTH_ENABLED) {
    return <SessionControls />;
  }

  // Dev / mock auth mode.
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-medium text-white">
          {DEV_USER.name}
        </span>
        <span className="block text-xs text-ink-500">dev mode · no auth</span>
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
