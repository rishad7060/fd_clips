"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWaitlistMode } from "@/lib/useWaitlistMode";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Floating bar pinned to the bottom of the landing page (Opus-style). It has two
 * modes, driven by the admin "waitlist mode" platform control:
 *
 *  - Normal (launched): "Drop a video link" → hands off to the builder at /new.
 *  - Waitlist (pre-launch): "Join the waitlist" email capture → POST /waitlist,
 *    with an inline success state (no toast, matching the hero form).
 *
 * Either way it auto-hides near the footer so it never covers the page chrome.
 */
export function StickyLinkBar() {
  const router = useRouter();
  const waitlist = useWaitlistMode() === true;
  const [value, setValue] = useState("");
  const [hidden, setHidden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Hide near the very bottom of the page so it doesn't sit over the footer.
  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 160;
      setHidden(nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const wrapCls = `pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-300 ease-premium ${
    hidden ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"
  }`;

  // ── Normal mode: video-link handoff ──────────────────────────────────────
  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    const u = value.trim();
    router.push(u ? `/new?url=${encodeURIComponent(u)}` : "/new");
  }

  // ── Waitlist mode: email capture ─────────────────────────────────────────
  async function submitWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const email = value.trim();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.joinWaitlist(email, "landing-sticky");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (waitlist && done) {
    return (
      <div className={wrapCls}>
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-xl items-center gap-2.5 rounded-full border border-brand/30 bg-ink-900/90 px-5 py-3 shadow-lift backdrop-blur-xl"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/20 text-brand-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <p className="text-sm font-medium text-white">
            You&apos;re on the list — we&apos;ll email you at launch.
          </p>
        </div>
      </div>
    );
  }

  if (waitlist) {
    return (
      <div className={`${wrapCls} flex-col items-center gap-2`}>
        {error && (
          <p className="pointer-events-auto rounded-full border border-danger-400/30 bg-ink-900/90 px-3 py-1 text-xs text-danger-400 shadow-lift backdrop-blur-xl" role="alert">
            {error}
          </p>
        )}
        <form
          onSubmit={submitWaitlist}
          className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 p-2 pl-4 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16v12H4z" />
            <path d="m4 7 8 6 8-6" />
          </svg>
          <input
            type="email"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Join the waitlist — your email"
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
      </div>
    );
  }

  // ── Normal mode ──────────────────────────────────────────────────────────
  return (
    <div className={wrapCls}>
      <form
        onSubmit={submitLink}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 p-2 pl-4 shadow-lift backdrop-blur-xl"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-ink-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
        </svg>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Drop a video link"
          aria-label="Video link"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition duration-200 ease-premium hover:bg-white/90 active:scale-95"
        >
          Get free clips
        </button>
      </form>
    </div>
  );
}
