import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AUTH_ENABLED } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { RegisterForm, OrDivider } from "@/components/CredentialsAuthForm";

/**
 * Self-hosted sign-up surface (Auth.js + Google OAuth). With Google there is no
 * separate registration step - the first sign-in auto-provisions the user/org -
 * so email/password registration lives alongside it. Kept as its own route for
 * friendly links and the catch-all segment for backwards compatibility.
 */
export default function SignUpPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-6 py-12">
      {/* Brand glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[130px]"
      />
      <div className="relative w-full max-w-md">
        {AUTH_ENABLED ? <SignUpCard /> : <DevNote />}
      </div>
    </main>
  );
}

function SignUpCard() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-8 shadow-rim sm:p-10">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white">
        Create your account
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        Start free - 60 credits a month, no card required.
      </p>

      <div className="mt-7">
        <GoogleSignInButton callbackUrl="/dashboard" label="Sign up with Google" />
      </div>
      <div className="my-5">
        <OrDivider />
      </div>
      <RegisterForm callbackUrl="/dashboard" />

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-300 transition hover:text-brand">
          Sign in
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
        enable real sign-up.
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
