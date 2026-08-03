"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { api, FALLBACK_PLANS, type PlanCatalogEntry } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing pricing - "Choose a plan", Opus-Clip-style layout with ClipsHQ's
 * half-Opus prices: Starter $7.50 (monthly only), Pro $14.50 with a Monthly /
 * Yearly toggle (Pro annual = 60% off, billed as $69.60/yr) and a ×N pack
 * stepper (1-10) that scales both Pro's credits and price. Business is
 * contact-only (no checkout). Live prices come from GET /plans when the real
 * API is configured; FALLBACK_PLANS (same confirmed economics) render
 * instantly and offline so the page never blocks on the fetch.
 * ──────────────────────────────────────────────────────────────────────────── */

const STARTER_FEATURES = [
  "150 source-minutes per month",
  "AI clipping with Virality Score",
  "AI animated captions in 40+ languages",
  "Face-aware vertical reframe",
  "Powerful editor",
  "1 brand template",
  "Filler & silence removal",
  "No watermark",
];

const PRO_FEATURES = [
  "Priority GPU processing",
  "Active-speaker reframe",
  "AI B-roll",
  "Multiple aspect ratios (9:16, 1:1, 16:9)",
  "Export to Premiere Pro & DaVinci Resolve",
  "Team workspace with 2 seats",
  "Custom fonts & speech enhancement",
];

const BUSINESS_FEATURES = [
  "Custom credits, team seats & connections",
  "API & custom integrations",
  "Dedicated storage",
  "Master Service Agreement (MSA)",
  "Priority support via a dedicated Slack channel",
  "Enterprise-grade security",
];

const MAX_PACK = 10;
const MIN_PACK = 1;

/** Format a USD price, dropping the trailing .00 but keeping .50 etc. */
function fmt(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, "");
}

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  const [pack, setPack] = useState(1);
  const [plans, setPlans] = useState<Record<"free" | "starter" | "pro", PlanCatalogEntry>>(
    FALLBACK_PLANS,
  );

  useEffect(() => {
    let alive = true;
    api
      .getPlans()
      .then((p) => {
        if (alive) setPlans(p);
      })
      .catch(() => {
        /* keep FALLBACK_PLANS - the page already rendered with them */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Starter has no annual option (Opus parity) - flipping to Yearly can't keep
  // Starter selected in that state, so we just message it instead of pricing it.
  const starter = plans.starter;
  const pro = plans.pro;
  const proAnnualPrice = pro.annualPriceUsd ?? FALLBACK_PLANS.pro.annualPriceUsd!;
  const proAnnualCredits = pro.annualCredits ?? FALLBACK_PLANS.pro.annualCredits!;
  const proMonthlyEquivalent = proAnnualPrice / 12;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Pricing
        </p>
        <h2 className="mx-auto mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Choose a plan
        </h2>

        {/* Monthly / Yearly toggle */}
        <div className="mt-7 flex items-center justify-center gap-3 text-sm font-medium">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`transition ${yearly ? "text-ink-400 hover:text-ink-200" : "text-white"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Toggle yearly billing"
            onClick={() => setYearly((v) => !v)}
            className="relative h-7 w-12 rounded-full bg-ink-800 ring-1 ring-white/10 transition hover:ring-white/20"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-gradient-to-b from-brand-300 to-brand shadow-glow transition-all duration-200 ease-premium ${yearly ? "left-6" : "left-1"}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`transition ${yearly ? "text-white" : "text-ink-400 hover:text-ink-200"}`}
          >
            Yearly
          </button>
        </div>

        {/* "Save up to 60%" banner */}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-3 py-1 text-sm font-medium text-success-300 ring-1 ring-success-500/20">
          Save up to 60% with annual billing
        </p>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {/* Starter */}
        <StarterCard plan={starter} yearly={yearly} />

        {/* Pro */}
        <ProCard
          plan={pro}
          yearly={yearly}
          pack={pack}
          setPack={setPack}
          annualPrice={proAnnualPrice}
          annualCredits={proAnnualCredits}
          monthlyEquivalent={proMonthlyEquivalent}
        />

        {/* Business */}
        <BusinessCard />
      </div>
    </section>
  );
}

function CardShell({
  highlight,
  children,
}: {
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 sm:p-8 ${
        highlight
          ? "border-brand/40 bg-gradient-to-b from-brand/[0.12] to-ink-900 shadow-glow lg:-mt-4"
          : "border-white/[0.08] bg-ink-900/60 hover:border-white/15"
      }`}
    >
      {children}
    </article>
  );
}

function CtaLink({
  href,
  label,
  highlight,
}: {
  href: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 ease-premium active:scale-95 ${
        highlight
          ? "bg-white text-ink-950 hover:bg-white/90"
          : "border border-white/15 bg-ink-900/60 text-white hover:border-white/30 hover:bg-ink-800"
      }`}
    >
      {label}
    </Link>
  );
}

function FeatureList({
  lead,
  features,
}: {
  lead?: string;
  features: string[];
}) {
  return (
    <ul className="mt-7 space-y-3 text-sm">
      {lead && <li className="font-semibold text-white">{lead}</li>}
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-ink-200">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" strokeWidth={2.5} aria-hidden />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function StarterCard({ plan, yearly }: { plan: PlanCatalogEntry; yearly: boolean }) {
  return (
    <CardShell>
      <h3 className="text-2xl font-semibold tracking-tight text-white">{plan.label}</h3>
      <p className="mt-1.5 max-w-[24ch] text-sm text-ink-300">For individual creators</p>

      <div className="mt-6 min-h-[3.5rem]">
        {yearly ? (
          <p className="text-sm font-medium text-ink-400">
            Starter plan only available in monthly
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tighter text-white tabular-nums">
                ${fmt(plan.priceUsd)}
              </span>
              <span className="text-sm font-medium text-ink-400">USD /mo</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">Billed monthly</p>
          </>
        )}
      </div>

      <CtaLink href="/new" label="Get started" />
      <p className="mt-2 text-center text-xs text-ink-500">No credit card required</p>

      <FeatureList features={STARTER_FEATURES.map((f) => f.replace("150 source-minutes per month", `${plan.monthlyCredits} source-minutes per month`))} />
    </CardShell>
  );
}

function ProCard({
  plan,
  yearly,
  pack,
  setPack,
  annualPrice,
  annualCredits,
  monthlyEquivalent,
}: {
  plan: PlanCatalogEntry;
  yearly: boolean;
  pack: number;
  setPack: (updater: (n: number) => number) => void;
  annualPrice: number;
  annualCredits: number;
  monthlyEquivalent: number;
}) {
  const credits = useMemo(
    () => (yearly ? annualCredits : plan.monthlyCredits) * pack,
    [yearly, annualCredits, plan.monthlyCredits, pack],
  );
  const billedAnnually = annualPrice * pack;
  const monthlyEquivalentPacked = monthlyEquivalent * pack;
  const monthlyPrice = plan.priceUsd * pack;

  const dec = () => setPack((n) => Math.max(MIN_PACK, n - 1));
  const inc = () => setPack((n) => Math.min(MAX_PACK, n + 1));

  return (
    <CardShell highlight>
      <span className="absolute right-6 top-6 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-glow">
        Most popular
      </span>

      <h3 className="text-2xl font-semibold tracking-tight text-white">{plan.label}</h3>
      <p className="mt-1.5 max-w-[24ch] text-sm text-ink-300">
        For professional creators, marketers &amp; teams
      </p>

      {/* Price */}
      <div className="mt-6 min-h-[3.5rem]">
        {yearly ? (
          <>
            <p className="flex items-baseline gap-1">
              <span className="mr-1 text-lg font-medium text-ink-500 line-through">
                ${fmt(plan.priceUsd * pack)}
              </span>
              <span className="font-display text-4xl font-semibold tracking-tighter text-success-300 tabular-nums">
                ${fmt(monthlyEquivalentPacked)}
              </span>
              <span className="text-sm font-medium text-ink-400">USD /mo</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">${fmt(billedAnnually)} billed annually</p>
          </>
        ) : (
          <>
            <p className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tighter text-white tabular-nums">
                ${fmt(monthlyPrice)}
              </span>
              <span className="text-sm font-medium text-ink-400">USD /mo</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">Billed monthly</p>
          </>
        )}
      </div>

      {/* Pack stepper */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2">
        <span className="text-xs font-medium text-ink-300">
          Pack <span className="text-white">×{pack}</span> · {credits.toLocaleString()} min
          {yearly ? "/yr" : "/mo"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Decrease pack quantity"
            onClick={dec}
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
            onClick={inc}
            disabled={pack >= MAX_PACK}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </div>

      <CtaLink href="/new" label="Get started" highlight />
      <p className="mt-2 text-center text-xs text-ink-500">No credit card required</p>

      <FeatureList lead="Everything in Starter, plus:" features={PRO_FEATURES} />
    </CardShell>
  );
}

function BusinessCard() {
  return (
    <CardShell>
      <h3 className="text-2xl font-semibold tracking-tight text-white">Business</h3>
      <p className="mt-1.5 max-w-[24ch] text-sm text-ink-300">
        For organizations that need tailored solutions, API, and more
      </p>

      <div className="mt-6 min-h-[3.5rem]">
        <p className="font-display text-3xl font-semibold tracking-tight text-white">
          Custom<span className="text-base font-normal text-ink-400"> pricing</span>
        </p>
        <p className="mt-1 text-xs text-ink-500">Custom pricing and packs</p>
      </div>

      <a
        href="mailto:clipshq.pro@gmail.com"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-ink-900/60 px-5 py-3 text-sm font-semibold text-white transition duration-200 ease-premium hover:border-white/30 hover:bg-ink-800 active:scale-95"
      >
        Contact us
      </a>

      <FeatureList lead="Everything in Pro, plus:" features={BUSINESS_FEATURES} />
    </CardShell>
  );
}
