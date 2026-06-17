"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CreditBalance } from "@/lib/types";

/**
 * Opus-style credits chip for the top bar: a lightning bolt + remaining credits,
 * plus an "Add credits" button. Fetches GET /billing/balance (real or mock).
 * Renders a quiet skeleton while loading and stays silent on error (the top bar
 * shouldn't break if billing is unreachable).
 */
export function CreditsChip() {
  const [bal, setBal] = useState<CreditBalance | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getBalance()
      .then((b) => alive && setBal(b))
      .catch(() => {/* keep the top bar quiet on billing errors */});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span
        title={bal ? `${bal.credit_balance} of ${bal.monthly_credits} min remaining · ${bal.plan} plan` : "Credits"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ink-850 px-2.5 py-1.5 text-sm font-semibold text-white ring-1 ring-ink-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-400" fill="currentColor">
          <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
        </svg>
        {bal ? (
          <span>{bal.credit_balance}</span>
        ) : (
          <span className="inline-block h-3 w-4 animate-pulse rounded bg-ink-700" />
        )}
      </span>
      <Link
        href="/billing"
        className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
      >
        Add credits
      </Link>
    </div>
  );
}
