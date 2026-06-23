"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const FIELD =
  "w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-ink-500 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/40";
const SUBMIT =
  "w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:bg-brand-600 active:scale-95 disabled:opacity-60 disabled:active:scale-100";

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
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="space-y-1.5">
        <label htmlFor="si-email" className="text-xs font-medium text-ink-300">Email</label>
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
      <div className="space-y-1.5">
        <label htmlFor="si-password" className="text-xs font-medium text-ink-300">Password</label>
        <input
          id="si-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={FIELD}
        />
      </div>
      {error ? <p className="text-sm text-danger-300">{error}</p> : null}
      <button type="submit" disabled={busy} className={SUBMIT}>
        {busy ? "Signing in…" : "Sign in"}
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
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="space-y-1.5">
        <label htmlFor="su-name" className="text-xs font-medium text-ink-300">Name</label>
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
        <label htmlFor="su-email" className="text-xs font-medium text-ink-300">Email</label>
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
      <div className="space-y-1.5">
        <label htmlFor="su-password" className="text-xs font-medium text-ink-300">Password</label>
        <input
          id="su-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className={FIELD}
        />
      </div>
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
    <div className="flex items-center gap-3 py-1 text-xs text-ink-500">
      <span className="h-px flex-1 bg-ink-700" />
      or
      <span className="h-px flex-1 bg-ink-700" />
    </div>
  );
}
