"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing pricing - "Choose a plan", adapted from the Opus-style reference into
 * the FocalDive Clips dark/brand design system. Three tiers (Starter · Pro ·
 * Business) with a Monthly/Yearly toggle. Prices mirror the in-app billing page
 * (Starter $7.50, Pro $14.50; credits = source-minutes); yearly bills at 20% off.
 * ──────────────────────────────────────────────────────────────────────────── */

type Plan = {
  name: string;
  blurb: string;
  monthly: number | null; // null → custom / contact pricing
  cta: { label: string; href: string };
  highlight?: boolean;
  featuresLead?: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    blurb: "For individual creators",
    monthly: 7.5,
    cta: { label: "Start your free trial", href: "/new" },
    features: [
      "150 source-minutes per month",
      "AI clipping with Virality Score",
      "AI animated captions in 40+ languages",
      "Face-aware vertical reframe",
      "Powerful editor",
      "1 brand template",
      "Filler & silence removal",
      "No watermark",
    ],
  },
  {
    name: "Pro",
    blurb: "For professional creators, marketers & teams",
    monthly: 14.5,
    cta: { label: "Start your free trial", href: "/new" },
    highlight: true,
    featuresLead: "Everything in Starter, plus:",
    features: [
      "300 source-minutes per month",
      "Priority GPU processing",
      "Active-speaker reframe",
      "AI B-roll",
      "Multiple aspect ratios (9:16, 1:1, 16:9)",
      "Export to Premiere Pro & DaVinci Resolve",
      "Team workspace with 2 seats",
      "Custom fonts & speech enhancement",
    ],
  },
  {
    name: "Business",
    blurb: "For organizations that need tailored solutions, API, and more",
    monthly: null,
    cta: { label: "Contact us", href: "mailto:clipshq.pro@gmail.com" },
    featuresLead: "Everything in Pro, plus:",
    features: [
      "Custom credits, team seats & connections",
      "API & custom integrations",
      "Dedicated storage",
      "Master Service Agreement (MSA)",
      "Priority support via a dedicated Slack channel",
      "Enterprise-grade security",
    ],
  },
];

/** Format a per-month price, dropping the trailing .00 but keeping .50 etc. */
function fmt(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, "");
}

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);

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
        <p className="mt-2 text-sm font-medium text-success-300">
          Save 20% with annual billing
        </p>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} yearly={yearly} />
        ))}
      </div>
    </section>
  );
}

function PlanCard({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const perMonth =
    plan.monthly === null ? null : yearly ? plan.monthly * 0.8 : plan.monthly;
  const billedAnnually =
    plan.monthly === null ? null : Math.round(plan.monthly * 0.8 * 12);

  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 sm:p-8 ${
        plan.highlight
          ? "border-brand/40 bg-gradient-to-b from-brand/[0.12] to-ink-900 shadow-glow lg:-mt-4"
          : "border-white/[0.08] bg-ink-900/60 hover:border-white/15"
      }`}
    >
      {plan.highlight && (
        <span className="absolute right-6 top-6 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-glow">
          Most popular
        </span>
      )}

      <h3 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h3>
      <p className="mt-1.5 max-w-[24ch] text-sm text-ink-300">{plan.blurb}</p>

      {/* Price */}
      <div className="mt-6 min-h-[3.5rem]">
        {perMonth === null ? (
          <p className="font-display text-3xl font-semibold tracking-tight text-white">
            Custom<span className="text-base font-normal text-ink-400"> pricing</span>
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-1">
              {yearly && (
                <span className="mr-1 text-lg font-medium text-ink-500 line-through">
                  ${fmt(plan.monthly!)}
                </span>
              )}
              <span className="font-display text-4xl font-semibold tracking-tighter text-white tabular-nums">
                ${fmt(perMonth)}
              </span>
              <span className="text-sm font-medium text-ink-400">USD /mo</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {yearly ? `$${billedAnnually} billed annually` : "Billed monthly"}
            </p>
          </>
        )}
      </div>

      {/* CTA */}
      <Link
        href={plan.cta.href}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 ease-premium active:scale-95 ${
          plan.highlight
            ? "bg-white text-ink-950 hover:bg-white/90"
            : "border border-white/15 bg-ink-900/60 text-white hover:border-white/30 hover:bg-ink-800"
        }`}
      >
        {plan.cta.label}
      </Link>
      {plan.monthly !== null && (
        <p className="mt-2 text-center text-xs text-ink-500">No credit card required</p>
      )}

      {/* Features */}
      <ul className="mt-7 space-y-3 text-sm">
        {plan.featuresLead && (
          <li className="font-semibold text-white">{plan.featuresLead}</li>
        )}
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-ink-200">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-300"
              strokeWidth={2.5}
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
