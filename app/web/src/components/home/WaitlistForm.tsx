"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pre-launch waitlist email capture. Reuses the StickyLinkBar rounded-full glass
 * pill (icon + borderless input + solid button). On success it swaps the form
 * for an inline confirmation - the app has no toast system, so success is shown
 * in place (matching the ClipBuilder / design-system idiom). Store-only: the
 * email is persisted and surfaced in the admin dashboard; no email is sent.
 */
export function WaitlistForm({ source = "landing-hero" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.joinWaitlist(value, source);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="mx-auto mt-8 flex w-full max-w-md items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/20 text-brand-300">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-white">You&apos;re on the list.</p>
          <p className="text-xs text-ink-300">
            We&apos;ll email you the moment FocalDive Clips launches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 p-2 pl-4 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-ink-400"
          fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition duration-200 ease-premium hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z" />
            </svg>
          )}
          {submitting ? "Joining…" : "Join waitlist"}
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-center text-sm text-danger-400">{error}</p>
      ) : (
        <p className="mt-3 text-center text-xs text-ink-500">
          Be first in line · no spam · unsubscribe anytime
        </p>
      )}
    </div>
  );
}
