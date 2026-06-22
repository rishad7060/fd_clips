"use client";

import { adminApi } from "@/lib/adminApi";
import type { AdminLedgerEntry } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/shadcn/badge";
import { fmtDateTime, shortId } from "@/components/admin/format";

const REASON_VARIANT = {
  grant: "success",
  debit: "secondary",
  refund: "warning",
} as const;

export default function AdminCreditsPage() {
  const columns: Column<AdminLedgerEntry>[] = [
    {
      header: "Reason",
      cell: (l) => <Badge variant={REASON_VARIANT[l.reason]}>{l.reason}</Badge>,
    },
    {
      header: "Amount",
      cell: (l) => (
        <span className={`tabular-nums font-medium ${l.amount >= 0 ? "text-success-400" : "text-danger-300"}`}>
          {l.amount >= 0 ? "+" : ""}
          {l.amount}
        </span>
      ),
    },
    { header: "Org", cell: (l) => <span className="font-mono text-xs">{shortId(l.organizationId)}</span> },
    { header: "Note", cell: (l) => <span className="text-muted-foreground">{l.note ?? "—"}</span> },
    { header: "Job", cell: (l) => <span className="font-mono text-xs">{l.jobId ? shortId(l.jobId) : "—"}</span> },
    { header: "When", cell: (l) => <span className="text-muted-foreground">{fmtDateTime(l.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Credits ledger</h2>
        <p className="text-sm text-muted-foreground">
          Append-only grants, debits and refunds across all organizations.
        </p>
      </div>
      <DataTable title="Ledger" columns={columns} fetcher={adminApi.listLedger} />
    </div>
  );
}
