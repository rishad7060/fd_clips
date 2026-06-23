"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminAffiliate } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { fmtDate, fmtNum, fmtUsd, shortId } from "@/components/admin/format";

export default function AdminAffiliatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Global default commission rate (the admin-configurable knob).
  const [defaultRate, setDefaultRate] = useState<number | null>(null);

  const columns: Column<AdminAffiliate>[] = [
    {
      header: "Affiliate",
      cell: (a) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{a.organizationName ?? shortId(a.organizationId)}</div>
          <div className="truncate text-xs text-muted-foreground">{a.ownerEmail ?? "-"}</div>
        </div>
      ),
    },
    { header: "Code", cell: (a) => <span className="font-mono text-xs">{a.code}</span> },
    {
      header: "Funnel",
      cell: (a) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {fmtNum(a.clicks)} · {fmtNum(a.signups)} · {fmtNum(a.conversions)}
        </span>
      ),
    },
    { header: "Earned", cell: (a) => <span className="font-mono tabular-nums">{fmtUsd(a.earnedCents / 100)}</span> },
    {
      header: "Pending",
      cell: (a) => (
        <span className="font-mono tabular-nums text-primary">{fmtUsd((a.earnedCents - a.paidCents) / 100)}</span>
      ),
    },
    {
      header: "Rate",
      cell: (a) => (
        <span className="text-muted-foreground">
          {a.commissionRate != null
            ? `${Math.round(a.commissionRate * 100)}%`
            : `${defaultRate != null ? Math.round(defaultRate * 100) : "—"}% (default)`}
        </span>
      ),
    },
    { header: "Since", cell: (a) => <span className="text-muted-foreground">{fmtDate(a.createdAt)}</span> },
    {
      header: "",
      className: "w-40 text-right",
      cell: (a) => <RowActions affiliate={a} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Affiliates</h2>
        <p className="text-sm text-muted-foreground">
          Referral accounts across all organizations, their funnel, and commission owed.
        </p>
      </div>

      <SettingsCard rate={defaultRate} onRate={setDefaultRate} />

      <DataTable
        title="All affiliates"
        columns={columns}
        fetcher={adminApi.listAffiliates}
        refreshKey={refreshKey}
        emptyText="No affiliates yet."
      />
    </div>
  );
}

/** Global default commission-rate editor. */
function SettingsCard({ rate, onRate }: { rate: number | null; onRate: (r: number) => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .getAffiliateSettings()
      .then((s) => {
        onRate(s.commissionRate);
        setValue(String(Math.round(s.commissionRate * 100)));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
    setSaving(true);
    setSaved(false);
    try {
      const s = await adminApi.setAffiliateSettings(pct / 100);
      onRate(s.commissionRate);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Default commission rate</div>
          <p className="text-xs text-muted-foreground">
            Applied to every affiliate without a custom rate. Current:{" "}
            {rate != null ? `${Math.round(rate * 100)}%` : "…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-24">
            <Input
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Per-row actions: pay out the pending balance, or set a custom rate. */
function RowActions({ affiliate, onChanged }: { affiliate: AdminAffiliate; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const pendingCents = affiliate.earnedCents - affiliate.paidCents;

  async function payout() {
    if (busy || pendingCents <= 0) return;
    if (!window.confirm(`Mark ${fmtUsd(pendingCents / 100)} as paid to ${affiliate.code}?`)) return;
    setBusy(true);
    try {
      await adminApi.payoutAffiliate(affiliate.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function editRate() {
    if (busy) return;
    const current = affiliate.commissionRate != null ? String(Math.round(affiliate.commissionRate * 100)) : "";
    const input = window.prompt(
      `Custom commission rate for ${affiliate.code} (0-100%). Leave blank to use the default.`,
      current,
    );
    if (input === null) return;
    const trimmed = input.trim();
    let rate: number | null;
    if (trimmed === "") {
      rate = null;
    } else {
      const pct = Number(trimmed);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
      rate = pct / 100;
    }
    setBusy(true);
    try {
      await adminApi.setAffiliateRate(affiliate.id, rate);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={editRate} disabled={busy}>
        Rate
      </Button>
      <Button size="sm" onClick={payout} disabled={busy || pendingCents <= 0}>
        Pay out
      </Button>
    </div>
  );
}
