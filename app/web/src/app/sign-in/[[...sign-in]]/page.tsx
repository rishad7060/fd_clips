import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CLERK_ENABLED } from "@/lib/auth";

/**
 * Hosted Clerk sign-in surface (catch-all route so Clerk can own its sub-paths,
 * e.g. SSO callbacks / factor steps). This is what makes Google OAuth work: the
 * <SignIn/> widget renders whatever social connections are enabled in the Clerk
 * Dashboard. In mock/dev mode (no Clerk keys) we never import @clerk/nextjs and
 * instead show a friendly note so the route still resolves with no credentials.
 */
export default async function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="flex flex-col items-center gap-8">
        <Logo />
        {CLERK_ENABLED ? await renderClerk() : <DevNote />}
      </div>
    </main>
  );
}

async function renderClerk() {
  const { SignIn } = await import("@clerk/nextjs");
  return (
    <SignIn
      appearance={{ baseTheme: undefined, variables: { colorPrimary: "#6366f1" } }}
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
    />
  );
}

function DevNote() {
  return (
    <div className="max-w-sm rounded-2xl border border-ink-700 bg-ink-900/70 p-8 text-center shadow-rim">
      <h1 className="text-lg font-semibold text-white">Dev mode — no Clerk</h1>
      <p className="mt-2 text-sm text-ink-300">
        Authentication is mocked locally. Add a Clerk publishable key to enable
        real sign-in (and Google OAuth).
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        Open dashboard
      </Link>
    </div>
  );
}
