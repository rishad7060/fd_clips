"use client";

import { useCallback, useMemo, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminJob, JobStatus, ListParams } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/badges";
import { JobRowActions } from "@/components/admin/JobRowActions";
import { fmtDateTime, shortId } from "@/components/admin/format";

const FILTERS: { label: string; value?: JobStatus }[] = [
  { label: "All" },
  { label: "Queued", value: "queued" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Canceled", value: "canceled" },
];

export default function AdminJobsPage() {
  const [status, setStatus] = useState<JobStatus | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const extraParams = useMemo<ListParams>(() => ({ status }), [status]);

  const columns: Column<AdminJob>[] = [
    {
      header: "Source",
      cell: (j) => (
        <div className="min-w-0">
          <div className="truncate text-foreground">{j.sourceUrl ?? `${j.sourceType} upload`}</div>
          <div className="font-mono text-xs text-muted-foreground">{shortId(j.id)}</div>
        </div>
      ),
    },
    { header: "Org", cell: (j) => <span className="font-mono text-xs">{shortId(j.organizationId)}</span> },
    { header: "Status", cell: (j) => <StatusBadge status={j.status} /> },
    {
      header: "Progress",
      cell: (j) => <span className="tabular-nums text-muted-foreground">{j.progress}%</span>,
    },
    { header: "Credits", cell: (j) => <span className="tabular-nums">{j.creditsCharged}</span> },
    { header: "Created", cell: (j) => <span className="text-muted-foreground">{fmtDateTime(j.createdAt)}</span> },
    {
      header: "",
      className: "w-12 text-right",
      cell: (j) => <JobRowActions job={j} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Jobs</h2>
        <p className="text-sm text-muted-foreground">Clipping jobs across all tenants.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <DataTable
        title="Jobs"
        columns={columns}
        fetcher={adminApi.listJobs}
        extraParams={extraParams}
        refreshKey={refreshKey}
      />
    </div>
  );
}
