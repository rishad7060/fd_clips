import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AUTH_ENABLED } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

/**
 * Self-hosted sign-up surface (Auth.js + Google OAuth). With Google there is no
 * separate registration step — the first sign-in auto-provisions the user/org —
 * so this mirrors the sign-in page. Kept as its own route for friendly links and
 * the catch-all segment for backwards compatibility.
 */
export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Logo />
        {AUTH_ENABLED ? <SignUpCard /> : <DevNote />}
      </div>
    </main>
  );
}

function SignUpCard() {
  return (
    <div className="w-full rounded-2xl border border-ink-700 bg-ink-900/70 p-8 text-center shadow-rim">
      <h1 className="text-lg font-semibold text-white">Create your account</h1>
      <p className="mt-2 text-sm text-ink-300">
        Start free — 60 credits/month, no card required.
      </p>
      <div className="mt-6">
        <GoogleSignInButton callbackUrl="/dashboard" label="Sign up with Google" />
      </div>
      <p className="mt-6 text-xs text-ink-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand hover:underline">
          Sign in
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
        the Google OAuth keys) to enable real sign-up.
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
