"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminWaitlistEntry } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { WaitlistStatusBadge } from "@/components/admin/badges";
import { WaitlistRowActions } from "@/components/admin/WaitlistRowActions";
import { fmtDateTime, relTime } from "@/components/admin/format";
import { Button } from "@/components/ui/shadcn/button";

export default function AdminWaitlistPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = await adminApi.exportWaitlistCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<AdminWaitlistEntry>[] = [
    {
      header: "Email",
      cell: (w) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{w.email}</div>
          {w.name ? (
            <div className="truncate text-xs text-muted-foreground">{w.name}</div>
          ) : null}
        </div>
      ),
    },
    { header: "Status", cell: (w) => <WaitlistStatusBadge status={w.status} /> },
    {
      header: "Source",
      cell: (w) => <span className="text-xs text-muted-foreground">{w.source ?? "-"}</span>,
    },
    {
      header: "Signed up",
      cell: (w) => (
        <span className="text-muted-foreground" title={fmtDateTime(w.createdAt)}>
          {relTime(w.createdAt)}
        </span>
      ),
    },
    {
      header: "",
      className: "w-12 text-right",
      cell: (w) => <WaitlistRowActions entry={w} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Waitlist</h2>
          <p className="text-sm text-muted-foreground">
            Pre-launch email signups captured from the landing page. Turn waitlist
            mode on/off in{" "}
            <a href="/admin/system" className="text-primary hover:underline">
              System
            </a>
            .
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>
      <DataTable
        title="Signups"
        columns={columns}
        fetcher={adminApi.listWaitlist}
        refreshKey={refreshKey}
        emptyText="No waitlist signups yet."
      />
    </div>
  );
}
