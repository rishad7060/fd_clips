import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AUTH_ENABLED } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { CredentialsSignInForm, OrDivider } from "@/components/CredentialsAuthForm";

/**
 * Self-hosted sign-in surface (Auth.js + Google OAuth). The catch-all segment is
 * kept so old /sign-in/* links still resolve. In mock/dev mode (auth disabled)
 * we show a friendly note so the route still resolves with no credentials.
 */
export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Logo />
        {AUTH_ENABLED ? <SignInCard /> : <DevNote />}
      </div>
    </main>
  );
}

function SignInCard() {
  return (
    <div className="w-full rounded-2xl border border-ink-700 bg-ink-900/70 p-8 text-center shadow-rim">
      <h1 className="text-lg font-semibold text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-300">
        Sign in to turn long videos into ranked, captioned shorts.
      </p>
      <div className="mt-6">
        <GoogleSignInButton callbackUrl="/dashboard" />
      </div>
      <div className="mt-5">
        <OrDivider />
      </div>
      <div className="mt-4">
        <CredentialsSignInForm callbackUrl="/dashboard" />
      </div>
      <p className="mt-6 text-xs text-ink-400">
        New here?{" "}
        <Link href="/sign-up" className="text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function DevNote() {
  return (
    <div className="w-full rounded-2xl border border-ink-700 bg-ink-900/70 p-8 text-center shadow-rim">
      <h1 className="text-lg font-semibold text-white">Dev mode — no auth</h1>
      <p className="mt-2 text-sm text-ink-300">
        Authentication is mocked locally. Set NEXT_PUBLIC_AUTH_ENABLED=true (and
        the Google OAuth keys) to enable real sign-in.
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
