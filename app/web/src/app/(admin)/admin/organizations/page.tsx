"use client";

import { useCallback, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminOrg } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PlanBadge } from "@/components/admin/badges";
import { OrgRowActions } from "@/components/admin/OrgRowActions";
import { fmtDate, fmtNum, shortId } from "@/components/admin/format";

export default function AdminOrganizationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const columns: Column<AdminOrg>[] = [
    {
      header: "Organization",
      cell: (o) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{o.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{shortId(o.id)}</div>
        </div>
      ),
    },
    { header: "Plan", cell: (o) => <PlanBadge plan={o.plan} /> },
    {
      header: "Credits",
      cell: (o) => <span className="tabular-nums">{fmtNum(o.creditBalance)}</span>,
    },
    { header: "Users", cell: (o) => <span className="tabular-nums">{o.userCount}</span> },
    { header: "Jobs", cell: (o) => <span className="tabular-nums">{o.jobCount}</span> },
    {
      header: "Subscription",
      cell: (o) => (
        <span className="text-xs text-muted-foreground">{o.subscriptionStatus ?? "—"}</span>
      ),
    },
    { header: "Created", cell: (o) => <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span> },
    {
      header: "",
      className: "w-12 text-right",
      cell: (o) => <OrgRowActions org={o} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Organizations</h2>
        <p className="text-sm text-muted-foreground">Tenants, plans and credit balances.</p>
      </div>
      <DataTable
        title="All organizations"
        columns={columns}
        fetcher={adminApi.listOrganizations}
        refreshKey={refreshKey}
      />
    </div>
  );
}
