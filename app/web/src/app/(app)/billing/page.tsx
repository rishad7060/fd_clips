"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CreditBalance } from "@/lib/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Billing / plans page (the "Add credits" target). Shows the current plan + credit
 * balance and the three tiers. Credits are source-MINUTES (1 credit = 1 minute).
 * Pricing is half of Opus Clip's (Starter $15, Pro $29) for the same minutes.
 * Upgrade buttons run the PayPal checkout flow (createOrder -> capture); in
 * mock/MVP the capture grants credits locally so the balance bar updates live.
 */
const PLANS = [
  { tier: "free", label: "Free", price: 0, credits: 30, features: ["30 source-minutes / mo", "6 clips per video", "Auto captions + hooks"] },
  { tier: "starter", label: "Starter", price: 7.5, credits: 150, features: ["150 source-minutes / mo", "All Free features", "1080p exports", "Priority queue"] },
  { tier: "pro", label: "Pro", price: 14.5, credits: 300, features: ["300 source-minutes / mo", "All Starter features", "Active-speaker reframe", "No watermark"] },
];

export default function BillingPage() {
  const [bal, setBal] = useState<CreditBalance | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.getBalance().then((b) => alive && setBal(b)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const current = bal?.plan ?? "free";

  async function upgrade(tier: "starter" | "pro") {
    if (pending) return; // guard the double-click window (state update is async)
    setError(null);
    setPending(tier);
    try {
      const order = await api.createOrder(tier);
      if (order.mock) {
        // Mock/MVP: no real PayPal redirect — capture immediately to simulate a
        // completed purchase, which grants credits and moves the balance bar.
        await api.captureOrder(order.order_id);
        const fresh = await api.getBalance();
        setBal(fresh);
      } else {
        // Real PayPal: hand off to the approval URL; capture happens on return.
        window.location.href = order.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-400 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Home
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Plans &amp; credits</h1>
      <p className="mt-1 text-sm text-ink-300">
        {bal
          ? `You're on the ${cap(bal.plan)} plan — ${bal.credit_balance} of ${bal.monthly_credits} minutes left this month.`
          : "Loading your balance…"}
      </p>

      {/* Balance bar */}
      {bal && (
        <div className="mt-5 max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-brand transition-all ease-premium"
              style={{ width: `${Math.round((bal.credit_balance / Math.max(1, bal.monthly_credits)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-xs tabular-nums text-ink-400">{bal.credit_balance} / {bal.monthly_credits} min</p>
        </div>
      )}

      {/* Plans */}
      <SectionTitle className="mt-8">Choose a plan</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.tier === current;
          return (
            <Card
              key={p.tier}
              className={`flex flex-col p-5 ${isCurrent ? "border-brand bg-brand/10 ring-1 ring-brand/40" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold tracking-tight text-white">{p.label}</h3>
                {isCurrent && (
                  <span className="rounded-lg bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Current</span>
                )}
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
                ${p.price.toFixed(2)}
                <span className="font-sans text-sm font-medium text-ink-400">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent || p.tier === "free" ? (
                <Button
                  variant="secondary"
                  full
                  disabled
                  className="mt-5"
                  title={p.tier === "free" ? "Free plan" : "Your current plan"}
                >
                  {isCurrent ? "Your plan" : "Included"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  full
                  loading={pending === p.tier}
                  disabled={pending !== null}
                  className="mt-5"
                  onClick={() => {
                    if (p.tier === "starter" || p.tier === "pro") upgrade(p.tier);
                  }}
                  title="Pay with PayPal"
                >
                  {pending === p.tier ? "Processing…" : `Upgrade to ${p.label}`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 text-xs text-danger-300">{error}</p>
      )}
      <p className="mt-6 text-xs text-ink-400">
        Checkout is processed by PayPal. Pricing is half of Opus Clip&apos;s for the same minutes.
        In this demo build (no PayPal keys), upgrades grant credits locally so you can try the flow.
      </p>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
