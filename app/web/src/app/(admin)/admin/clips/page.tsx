"use client";

import { useCallback, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminClip } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ClipRowActions } from "@/components/admin/ClipRowActions";
import { Badge } from "@/components/ui/shadcn/badge";
import { fmtDate, shortId } from "@/components/admin/format";

function scoreVariant(score: number): "success" | "warning" | "secondary" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "secondary";
}

export default function AdminClipsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const columns: Column<AdminClip>[] = [
    {
      header: "Hook",
      cell: (c) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{c.hookLine}</div>
          <div className="truncate text-xs text-muted-foreground">{c.suggestedTitle}</div>
        </div>
      ),
    },
    { header: "Rank", cell: (c) => <span className="tabular-nums">#{c.rank}</span> },
    {
      header: "Virality",
      cell: (c) => <Badge variant={scoreVariant(c.viralityScore)}>{c.viralityScore}</Badge>,
    },
    { header: "Job", cell: (c) => <span className="font-mono text-xs">{shortId(c.jobId)}</span> },
    { header: "Org", cell: (c) => <span className="font-mono text-xs">{shortId(c.organizationId)}</span> },
    { header: "Created", cell: (c) => <span className="text-muted-foreground">{fmtDate(c.createdAt)}</span> },
    {
      header: "",
      className: "w-12 text-right",
      cell: (c) => <ClipRowActions clip={c} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Clips</h2>
        <p className="text-sm text-muted-foreground">Rendered clips ranked by virality.</p>
      </div>
      <DataTable
        title="All clips"
        columns={columns}
        fetcher={adminApi.listClips}
        refreshKey={refreshKey}
      />
    </div>
  );
}
