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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-6 py-12">
      {/* Brand glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[130px]"
      />
      <div className="relative w-full max-w-md">
        {AUTH_ENABLED ? <SignInCard /> : <DevNote />}
      </div>
    </main>
  );
}

function SignInCard() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-8 shadow-rim sm:p-10">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tighter text-white">
        Welcome back
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        Sign in to turn long videos into ranked, captioned, vertical shorts -
        delivered to your inbox in about 30 minutes.
      </p>

      <div className="mt-7">
        <GoogleSignInButton callbackUrl="/dashboard" />
      </div>
      <div className="my-5">
        <OrDivider />
      </div>
      <CredentialsSignInForm callbackUrl="/dashboard" />

      <p className="mt-6 text-center text-sm text-ink-400">
        New to Clips?{" "}
        <Link href="/sign-up" className="font-semibold text-brand-300 transition hover:text-brand">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function DevNote() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-8 text-center shadow-rim sm:p-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-white">
        Dev mode - no auth
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        Authentication is mocked locally. Set NEXT_PUBLIC_AUTH_ENABLED=true to
        enable real sign-in.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-full bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:from-brand hover:to-brand-600"
      >
        Open dashboard
      </Link>
    </div>
  );
}
