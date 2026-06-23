"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AffiliateSummary } from "@/lib/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Affiliate dashboard (creator side). Shows the org's referral link, the full
 * funnel (clicks → signups → conversions), commission earnings (pending/paid),
 * and referral history. Every customer auto-gets an account, so this always
 * renders. Mirrors the billing page's layout + the design-system primitives.
 */
export default function AffiliatesPage() {
  const [aff, setAff] = useState<AffiliateSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getAffiliate()
      .then((a) => alive && setAff(a))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load affiliate data."));
    return () => {
      alive = false;
    };
  }, []);

  async function copyLink() {
    if (!aff) return;
    try {
      await navigator.clipboard.writeText(aff.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - the input is selectable as a fallback */
    }
  }

  const ratePct = aff ? Math.round(aff.commission_rate * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-400 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Home
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Affiliate program</h1>
      <p className="mt-1 text-sm text-ink-300">
        Share your link and earn {aff ? `${ratePct}%` : "a commission"} of every payment from
        creators you refer - for as long as they stay subscribed.
      </p>

      {/* Referral link */}
      <Card className="mt-6 p-5">
        <SectionTitle>Your referral link</SectionTitle>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            readOnly
            value={aff?.link ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Loading…"
            className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-brand/50"
          />
          <Button onClick={copyLink} disabled={!aff} className="shrink-0">
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
        {aff && (
          <p className="mt-2 text-xs text-ink-400">
            Code <span className="font-mono text-ink-300">{aff.code}</span> · pays {ratePct}% recurring commission.
          </p>
        )}
      </Card>

      {/* Funnel + earnings */}
      <SectionTitle className="mt-8">Performance</SectionTitle>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Clicks" value={aff ? fmtNum(aff.clicks) : "—"} />
        <Stat label="Signups" value={aff ? fmtNum(aff.signups) : "—"} />
        <Stat label="Conversions" value={aff ? fmtNum(aff.conversions) : "—"} />
        <Stat label="Pending" value={aff ? fmtUsd(aff.pending_usd) : "—"} accent />
        <Stat label="Paid out" value={aff ? fmtUsd(aff.paid_usd) : "—"} />
      </div>

      {/* Referral history */}
      <SectionTitle className="mt-8">Referrals</SectionTitle>
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-3 font-medium">Referred user</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Earned</th>
              </tr>
            </thead>
            <tbody>
              {aff && aff.referrals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                    No referrals yet - share your link to get started.
                  </td>
                </tr>
              )}
              {aff?.referrals.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-ink-200">{r.referred_email ?? "Anonymous"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-400">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-200">{fmtUsd(r.earned_usd)}</td>
                </tr>
              ))}
              {!aff && !error && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-400">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {error && <p className="mt-6 text-xs text-danger-300">{error}</p>}
      <p className="mt-6 text-xs text-ink-400">
        Commissions accrue as a pending balance and are paid out by our team. Recurring: you earn
        on every renewal a referred creator pays, not just their first month.
      </p>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${accent ? "text-brand-300" : "text-white"}`}>
        {value}
      </p>
    </Card>
  );
}

function StatusPill({ status }: { status: "signed_up" | "converted" }) {
  const converted = status === "converted";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
        converted ? "bg-success/15 text-success" : "bg-ink-800 text-ink-300 ring-1 ring-white/10"
      }`}
    >
      {converted ? "Converted" : "Signed up"}
    </span>
  );
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
