"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm text-white placeholder:text-ink-400 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/40";
const LABEL = "text-sm font-semibold text-white";
const SUBMIT =
  "mt-1 w-full rounded-full bg-gradient-to-b from-brand-400 to-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100";

/** Open/closed eye glyph for the password visibility toggle (stroke-1.8). */
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.16 4.06" />
          <path d="M6.2 6.2A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.06-1.2" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

/** Password input with a show/hide toggle, label, and an optional side link. */
function PasswordField({
  id,
  value,
  onChange,
  label,
  autoComplete,
  placeholder,
  minLength,
  sideLink,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  sideLink?: { href: string; label: string };
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        {sideLink ? (
          <Link
            href={sideLink.href}
            className="text-xs font-medium text-brand-300 transition hover:text-brand"
          >
            {sideLink.label}
          </Link>
        ) : null}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${FIELD} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-400 transition hover:text-white"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

/** Email + password sign-in for basic users (user-credentials provider). */
export function CredentialsSignInForm({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn("user-credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div className="space-y-1.5">
        <label htmlFor="si-email" className={LABEL}>
          Email
        </label>
        <input
          id="si-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={FIELD}
        />
      </div>
      <PasswordField
        id="si-password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        sideLink={{ href: "/help", label: "Forgot password?" }}
      />
      {error ? <p className="text-sm text-danger-300">{error}</p> : null}
      <button type="submit" disabled={busy} className={SUBMIT}>
        {busy ? "Signing in…" : "Sign in with email"}
      </button>
    </form>
  );
}

/** Name + email + password registration → /api/register then auto sign-in. */
export function RegisterForm({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setBusy(false);
      setError(data.error ?? "Registration failed. Please try again.");
      return;
    }

    // Account created - establish the session with the same credentials.
    const login = await signIn("user-credentials", { email, password, redirect: false });
    setBusy(false);
    if (login?.error) {
      // Created but auto-login failed - send them to sign in manually.
      router.push("/sign-in");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div className="space-y-1.5">
        <label htmlFor="su-name" className={LABEL}>
          Name
        </label>
        <input
          id="su-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          className={FIELD}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="su-email" className={LABEL}>
          Email
        </label>
        <input
          id="su-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={FIELD}
        />
      </div>
      <PasswordField
        id="su-password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        minLength={8}
      />
      {error ? <p className="text-sm text-danger-300">{error}</p> : null}
      <button type="submit" disabled={busy} className={SUBMIT}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

/** "or" divider between Google and the credentials form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-ink-400">
      <span className="h-px flex-1 bg-white/10" />
      or
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
