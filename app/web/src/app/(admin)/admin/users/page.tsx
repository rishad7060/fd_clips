"use client";

import { useCallback, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminUser } from "@/lib/adminTypes";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { RoleBadge } from "@/components/admin/badges";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { fmtDate, relTime, shortId } from "@/components/admin/format";

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const columns: Column<AdminUser>[] = [
    {
      header: "User",
      cell: (u) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{u.name ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{u.email}</div>
        </div>
      ),
    },
    { header: "Role", cell: (u) => <RoleBadge role={u.role} /> },
    { header: "Org", cell: (u) => <span className="font-mono text-xs">{shortId(u.organizationId)}</span> },
    { header: "Last login", cell: (u) => <span className="text-muted-foreground">{relTime(u.lastLoginAt)}</span> },
    { header: "Joined", cell: (u) => <span className="text-muted-foreground">{fmtDate(u.createdAt)}</span> },
    {
      header: "",
      className: "w-12 text-right",
      cell: (u) => <UserRowActions user={u} onChanged={refresh} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">Every account across all organizations.</p>
      </div>
      <DataTable
        title="All users"
        columns={columns}
        fetcher={adminApi.listUsers}
        refreshKey={refreshKey}
      />
    </div>
  );
}
