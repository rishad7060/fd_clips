"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { api, FALLBACK_PLANS, type BillingPeriod, type PlanCatalogEntry } from "@/lib/api";
import { emitCreditsChanged } from "@/lib/creditsBus";
import type { CreditBalance, CreditBreakdown } from "@/lib/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Billing / plans page (the "Add credits" target). Shows the current plan +
 * credit balance and the three tiers (Free / Starter / Pro), with Pro's
 * Monthly⇄Yearly toggle (annual = 60% off) and ×N pack stepper (1-10, scales
 * both credits and price). Credits are source-MINUTES (1 credit = 1 minute).
 * Pricing is half of Opus Clip's (Starter $7.50, Pro $14.50) for the same
 * minutes. Upgrade buttons start a Polar.sh subscription checkout with the
 * chosen period + quantity; in mock/MVP the plan is granted locally so the
 * balance bar updates live.
 */
const MIN_PACK = 1;
const MAX_PACK = 10;

/** Plan rank order for upgrade/downgrade comparisons: free(0) < starter(1) < pro(2). */
const PLAN_RANK: Record<"free" | "starter" | "pro", number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

/**
 * The CTA a plan card should show, computed from the card's tier relative to the
 * user's CURRENT plan:
 *   - "current"   -> this IS the current plan (badge + Cancel for paid).
 *   - "upgrade"   -> a plan ABOVE the current one ("Upgrade to X").
 *   - "downgrade" -> a plan BELOW the current one ("Downgrade to X").
 */
type PlanRelation = "current" | "upgrade" | "downgrade";

function planRelation(
  tier: "free" | "starter" | "pro",
  current: "free" | "starter" | "pro",
): PlanRelation {
  if (tier === current) return "current";
  return PLAN_RANK[tier] > PLAN_RANK[current] ? "upgrade" : "downgrade";
}

/** The verb shown on a paid tier's CTA for a given relation ("Upgrade"/"Downgrade"). */
function ctaVerb(relation: PlanRelation): "Upgrade" | "Downgrade" {
  return relation === "downgrade" ? "Downgrade" : "Upgrade";
}

/** Format a USD price, dropping the trailing .00 but keeping .50 etc. */
function fmt(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, "");
}

export default function BillingPage() {
  const [bal, setBal] = useState<CreditBalance | null>(null);
  const [breakdown, setBreakdown] = useState<CreditBreakdown | null>(null);
  const [plans, setPlans] = useState<Record<"free" | "starter" | "pro", PlanCatalogEntry>>(
    FALLBACK_PLANS,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const [pack, setPack] = useState(1);

  useEffect(() => {
    let alive = true;

    async function load() {
      // Returning from Polar's hosted checkout? The success URL carries the
      // checkout id - confirm it server-side (grants the plan when webhooks
      // can't reach the API, e.g. localhost), then strip the params so a refresh
      // doesn't re-confirm.
      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get("checkout_id");
      if (checkoutId && !api.usingMock) {
        try {
          await api.confirmCheckout(checkoutId);
        } catch {
          /* fall through - the balance fetch still reflects current state */
        }
        params.delete("checkout_id");
        params.delete("ok");
        const qs = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (qs ? `?${qs}` : ""),
        );
      }

      const [b, p, bd] = await Promise.all([
        api.getBalance(),
        api.getPlans(),
        api.getCreditBreakdown().catch(() => null),
      ]);
      if (alive) {
        setBal(b);
        setPlans(p);
        setBreakdown(bd);
      }
      // A confirm above may have just granted the plan after the top-bar chip
      // already fetched the old balance - ping it to re-fetch.
      emitCreditsChanged();
    }

    load().catch(() => {});
    return () => { alive = false; };
  }, []);

  const current: "free" | "starter" | "pro" =
    bal?.plan === "starter" || bal?.plan === "pro" ? bal.plan : "free";
  const pro = plans.pro;
  const annualPrice = pro.annualPriceUsd ?? FALLBACK_PLANS.pro.annualPriceUsd!;
  const annualCredits = pro.annualCredits ?? FALLBACK_PLANS.pro.annualCredits!;

  async function upgrade(tier: "starter" | "pro") {
    if (pending) return; // guard the double-click window (state update is async)
    setError(null);
    setPending(tier);
    try {
      // Recurring subscription flow: start the subscription, then hand off to
      // Polar's hosted checkout. Starter is always monthly/×1 (Opus parity);
      // Pro sends the chosen period + pack quantity. In mock mode there's no
      // real redirect (the plan is granted locally), so we just refresh the
      // balance.
      const period: BillingPeriod = tier === "pro" && yearly ? "annual" : "monthly";
      const quantity = tier === "pro" ? pack : 1;
      const sub = await api.createSubscription(tier, { period, quantity });
      if (sub.mock) {
        const [fresh, bd] = await Promise.all([
          api.getBalance(),
          api.getCreditBreakdown().catch(() => null),
        ]);
        setBal(fresh);
        setBreakdown(bd);
        emitCreditsChanged();
      } else {
        // Real Polar: redirect to the hosted checkout immediately. On success
        // Polar returns to BILLING_SUCCESS_URL and the order.paid /
        // subscription.active webhook grants the credits.
        window.location.href = sub.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function cancel() {
    if (pending) return;
    setError(null);
    setPending("cancel");
    try {
      await api.cancelSubscription();
      const [fresh, bd] = await Promise.all([
        api.getBalance(),
        api.getCreditBreakdown().catch(() => null),
      ]);
      setBal(fresh);
      setBreakdown(bd);
      emitCreditsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel. Please try again.");
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
          ? `You're on the ${cap(bal.plan)} plan - you have ${bal.credit_balance.toLocaleString()} minute${bal.credit_balance === 1 ? "" : "s"} of credit left${bal.plan !== "free" ? ` (${bal.monthly_credits.toLocaleString()} added each month).` : "."}`
          : "Loading your balance…"}
      </p>

      {/* Balance bar. Credits STACK (free + purchases + packs) so the balance can
          exceed the plan's monthly grant. Use the larger of the two as the bar's
          full mark so it never overflows 100% and the "333 of 300" nonsense is gone. */}
      {bal && (() => {
        const barMax = Math.max(bal.credit_balance, bal.monthly_credits, 1);
        const pct = Math.min(100, Math.round((bal.credit_balance / barMax) * 100));
        return (
          <div className="mt-5 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-brand transition-all ease-premium"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs tabular-nums text-ink-400">
              {bal.credit_balance.toLocaleString()} min available
            </p>
          </div>
        );
      })()}

      {/* Where your credits came from: one line per grant source (free grant, each
          plan/pack purchase), minus what you've used. Makes the stacked balance
          transparent ("60 free + 300 Pro - 27 used = 333"). */}
      {breakdown && (breakdown.grants.length > 0 || breakdown.used > 0) && (
        <div className="mt-4 max-w-md rounded-xl border border-white/10 bg-ink-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Where your credits came from
          </p>
          <ul className="mt-2.5 space-y-1.5 text-sm">
            {breakdown.grants.map((g) => (
              <li key={g.label} className="flex items-center justify-between">
                <span className="text-ink-200">
                  {g.label}
                  {g.count > 1 && <span className="ml-1.5 text-ink-500">×{g.count}</span>}
                </span>
                <span className="font-mono tabular-nums text-success">+{g.amount.toLocaleString()}</span>
              </li>
            ))}
            {breakdown.used > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-ink-200">Used on clips</span>
                <span className="font-mono tabular-nums text-ink-400">-{breakdown.used.toLocaleString()}</span>
              </li>
            )}
            {breakdown.refunded > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-ink-200">Refunded (failed jobs)</span>
                <span className="font-mono tabular-nums text-success">+{breakdown.refunded.toLocaleString()}</span>
              </li>
            )}
          </ul>
          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2.5 text-sm font-semibold">
            <span className="text-white">Balance</span>
            <span className="font-mono tabular-nums text-white">{breakdown.balance.toLocaleString()} min</span>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle>Choose a plan</SectionTitle>

        {/* Monthly / Yearly toggle - only Pro has an annual option */}
        <div className="flex items-center gap-2.5 text-xs font-medium">
          <span className={yearly ? "text-ink-400" : "text-white"}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Toggle yearly billing"
            onClick={() => setYearly((v) => !v)}
            className="relative h-6 w-11 rounded-full bg-ink-800 ring-1 ring-white/10 transition hover:ring-white/20"
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-gradient-to-b from-brand-300 to-brand shadow-glow transition-all duration-200 ease-premium ${yearly ? "left-6" : "left-1"}`}
            />
          </button>
          <span className={yearly ? "text-white" : "text-ink-400"}>Yearly</span>
          <span className="ml-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-semibold text-success-300 ring-1 ring-success-500/20">
            Save up to 60%
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {/* Free */}
        <PlanTile
          tier="free"
          label="Free"
          isCurrent={current === "free"}
          price={0}
          priceSuffix="/mo"
          features={[`${plans.free.monthlyCredits} source-minutes / mo`, "Up to 1080p clips", "Auto captions + hooks", "Has watermark · clips expire in 3 days"]}
        >
          {current === "free" ? (
            <Button variant="secondary" full disabled className="mt-5" title="Free plan">
              Your plan
            </Button>
          ) : (
            /* On a paid plan, Free is below current: downgrading to Free = cancel
               the paid subscription (existing keep-credits cancel path). */
            <Button
              variant="secondary"
              full
              loading={pending === "cancel"}
              disabled={pending !== null}
              className="mt-5"
              onClick={cancel}
              title="Cancel your paid plan and move to Free (you keep credits already granted)"
            >
              {pending === "cancel" ? "Canceling…" : "Downgrade to Free"}
            </Button>
          )}
        </PlanTile>

        {/* Starter - monthly only (Opus parity) */}
        <PlanTile
          tier="starter"
          label="Starter"
          isCurrent={current === "starter"}
          price={plans.starter.priceUsd}
          priceSuffix="/mo"
          note={yearly ? "Starter plan only available in monthly" : undefined}
          features={[`${plans.starter.monthlyCredits} source-minutes / mo`, "All Free features", "No watermark", "Powerful editor"]}
        >
          {current === "starter" ? (
            <Button
              variant="secondary"
              full
              loading={pending === "cancel"}
              disabled={pending !== null}
              className="mt-5"
              onClick={cancel}
              title="Cancel subscription (downgrades to Free)"
            >
              {pending === "cancel" ? "Canceling…" : "Cancel plan"}
            </Button>
          ) : (
            <Button
              variant="primary"
              full
              loading={pending === "starter"}
              disabled={pending !== null}
              className="mt-5"
              onClick={() => upgrade("starter")}
              title={
                planRelation("starter", current) === "downgrade"
                  ? "Switch to Starter via Polar (credits already granted are kept)"
                  : "Subscribe with Polar"
              }
            >
              {pending === "starter"
                ? "Processing…"
                : `${ctaVerb(planRelation("starter", current))} to Starter`}
            </Button>
          )}
        </PlanTile>

        {/* Pro - annual + pack */}
        <Card className={`flex flex-col p-5 ${current === "pro" ? "border-brand bg-brand/10 ring-1 ring-brand/40" : "border-brand/30"}`}>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-white">Pro</h3>
            {current === "pro" ? (
              <span className="rounded-lg bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Current</span>
            ) : (
              <span className="rounded-lg border border-brand/40 px-2 py-0.5 text-[11px] font-semibold text-brand-300">Most popular</span>
            )}
          </div>

          {yearly ? (
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-medium text-ink-500 line-through">
                ${fmt(plans.pro.priceUsd * pack)}
              </span>
              <span className="font-mono text-3xl font-semibold tabular-nums text-success-300">
                ${fmt((annualPrice / 12) * pack)}
              </span>
              <span className="font-sans text-sm font-medium text-ink-400">/mo</span>
            </p>
          ) : (
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
              ${fmt(plans.pro.priceUsd * pack)}
              <span className="font-sans text-sm font-medium text-ink-400">/mo</span>
            </p>
          )}
          <p className="mt-0.5 text-xs text-ink-500">
            {yearly ? `$${fmt(annualPrice * pack)} billed annually` : "Billed monthly"}
          </p>

          {/* Pack stepper */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2">
            <span className="text-xs font-medium text-ink-300">
              Pack <span className="text-white">×{pack}</span> ·{" "}
              {((yearly ? annualCredits : plans.pro.monthlyCredits) * pack).toLocaleString()} min
              {yearly ? "/yr" : "/mo"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Decrease pack quantity"
                onClick={() => setPack((n) => Math.max(MIN_PACK, n - 1))}
                disabled={pack <= MIN_PACK}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-white" aria-live="polite">
                {pack}
              </span>
              <button
                type="button"
                aria-label="Increase pack quantity"
                onClick={() => setPack((n) => Math.min(MAX_PACK, n + 1))}
                disabled={pack >= MAX_PACK}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>

          <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-300">
            {["All Starter features", "Active-speaker reframe", "Priority processing", "Multiple aspect ratios"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {current === "pro" ? (
            <Button
              variant="secondary"
              full
              loading={pending === "cancel"}
              disabled={pending !== null}
              className="mt-5"
              onClick={cancel}
              title="Cancel subscription (downgrades to Free)"
            >
              {pending === "cancel" ? "Canceling…" : "Cancel plan"}
            </Button>
          ) : (
            <Button
              variant="primary"
              full
              loading={pending === "pro"}
              disabled={pending !== null}
              className="mt-5"
              onClick={() => upgrade("pro")}
              title={
                planRelation("pro", current) === "downgrade"
                  ? "Switch to Pro via Polar (credits already granted are kept)"
                  : "Subscribe with Polar"
              }
            >
              {pending === "pro"
                ? "Processing…"
                : `${ctaVerb(planRelation("pro", current))} to Pro`}
            </Button>
          )}
        </Card>
      </div>

      {error && (
        <p className="mt-6 text-xs text-danger-300">{error}</p>
      )}
      <p className="mt-6 rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-2.5 text-xs text-ink-300">
        <span className="font-semibold text-white">New plan credits are added to your current balance.</span>{" "}
        When you change plans, the new plan starts immediately and its credits stack on top of what you
        already have - nothing you&apos;ve been granted is lost. Downgrading keeps every credit already in
        your balance.
      </p>
      <p className="mt-3 text-xs text-ink-400">
        Subscriptions are billed through Polar (card &amp; more, no account required). Pro&apos;s
        annual plan is 60% off and its pack stepper (×1-10) scales both credits and price -
        Starter is monthly-only. Pricing is half of Opus Clip&apos;s for the same minutes. Cancel
        anytime - you keep access until the period ends. In this demo build (no Polar token),
        upgrades activate locally so you can try the flow.
      </p>
    </div>
  );
}

function PlanTile({
  label,
  isCurrent,
  price,
  priceSuffix,
  note,
  features,
  children,
}: {
  tier: string;
  label: string;
  isCurrent: boolean;
  price: number;
  priceSuffix: string;
  note?: string;
  features: string[];
  children: React.ReactNode;
}) {
  return (
    <Card className={`flex flex-col p-5 ${isCurrent ? "border-brand bg-brand/10 ring-1 ring-brand/40" : ""}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">{label}</h3>
        {isCurrent && (
          <span className="rounded-lg bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Current</span>
        )}
      </div>
      {note ? (
        <p className="mt-2 text-sm font-medium text-ink-400">{note}</p>
      ) : (
        <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
          ${price.toFixed(2)}
          <span className="font-sans text-sm font-medium text-ink-400">{priceSuffix}</span>
        </p>
      )}
      <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-300">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      {children}
    </Card>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
