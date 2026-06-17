"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CreditBalance } from "@/lib/types";

/**
 * Billing / plans page (the "Add credits" target). Shows the current plan + credit
 * balance and the three tiers. Credits are source-MINUTES (1 credit = 1 minute).
 * Upgrade buttons hit the checkout flow when wired (Stripe); in mock/MVP they are
 * marked clearly so nothing is a silent dead-end.
 */
const PLANS = [
  { tier: "free", label: "Free", price: 0, credits: 30, features: ["30 source-minutes / mo", "6 clips per video", "Auto captions + hooks"] },
  { tier: "starter", label: "Starter", price: 12, credits: 150, features: ["150 source-minutes / mo", "All Free features", "1080p exports", "Priority queue"] },
  { tier: "pro", label: "Pro", price: 25, credits: 300, features: ["300 source-minutes / mo", "All Starter features", "Active-speaker reframe", "No watermark"] },
];

export default function BillingPage() {
  const [bal, setBal] = useState<CreditBalance | null>(null);

  useEffect(() => {
    let alive = true;
    api.getBalance().then((b) => alive && setBal(b)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const current = bal?.plan ?? "free";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-2 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-ink-500 hover:text-white">← Home</Link>
      </div>
      <h1 className="text-2xl font-bold text-white">Plans & credits</h1>
      <p className="mt-1 text-sm text-white/60">
        {bal
          ? `You're on the ${cap(bal.plan)} plan — ${bal.credit_balance} of ${bal.monthly_credits} minutes left this month.`
          : "Loading your balance…"}
      </p>

      {/* Balance bar */}
      {bal && (
        <div className="mt-5 max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.round((bal.credit_balance / Math.max(1, bal.monthly_credits)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-500">{bal.credit_balance} / {bal.monthly_credits} min</p>
        </div>
      )}

      {/* Plans */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.tier === current;
          return (
            <div
              key={p.tier}
              className={`flex flex-col rounded-2xl border p-5 ${
                isCurrent ? "border-brand/60 bg-brand/5 ring-1 ring-brand/30" : "border-ink-700 bg-ink-900/60"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold text-white">{p.label}</h3>
                {isCurrent && (
                  <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-ink-950">Current</span>
                )}
              </div>
              <p className="mt-2 text-3xl font-extrabold text-white">
                ${p.price}
                <span className="text-sm font-medium text-ink-500">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/70">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={isCurrent || p.tier === "free"}
                className={`mt-5 rounded-xl py-2.5 text-sm font-semibold transition ${
                  isCurrent || p.tier === "free"
                    ? "cursor-not-allowed bg-ink-800 text-ink-500"
                    : "bg-white text-ink-950 hover:bg-white/90"
                }`}
                title={p.tier === "free" ? "Free plan" : isCurrent ? "Your current plan" : "Checkout requires Stripe keys"}
              >
                {isCurrent ? "Your plan" : p.tier === "free" ? "Included" : `Upgrade to ${p.label}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-500">
        Checkout is processed by Stripe. In this demo build, upgrades are disabled until billing keys are configured.
      </p>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
