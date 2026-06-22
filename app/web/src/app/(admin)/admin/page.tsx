"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Briefcase, Coins, DollarSign } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminOverview } from "@/lib/adminTypes";
import { StatCard } from "@/components/admin/StatCard";
import { OverviewChart } from "@/components/admin/OverviewChart";
import { StatusBadge } from "@/components/admin/badges";
import { fmtNum, fmtUsd, fmtDate, shortId } from "@/components/admin/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/shadcn/tabs";
import { Skeleton } from "@/components/ui/shadcn/skeleton";

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function AdminOverviewPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .getOverview(range)
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Organizations" value={fmtNum(data.totals.organizations)} icon={Building2} />
            <StatCard label="Users" value={fmtNum(data.totals.users)} icon={Users} accent="success" />
            <StatCard
              label="Jobs"
              value={fmtNum(data.totals.jobs)}
              sub={`${data.jobsByStatus.completed} done · ${data.jobsByStatus.failed} failed`}
              icon={Briefcase}
              accent="warning"
            />
            <StatCard label="Credits out" value={fmtNum(data.totals.creditsOutstanding)} icon={Coins} />
            <StatCard label="Est. MRR" value={fmtUsd(data.revenueMrrUsd)} icon={DollarSign} accent="success" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Activity</CardTitle>
            <div className="flex items-center gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    range === r.value
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <Tabs defaultValue="jobs">
                <TabsList>
                  <TabsTrigger value="jobs">Jobs</TabsTrigger>
                  <TabsTrigger value="credits">Credits</TabsTrigger>
                </TabsList>
                <TabsContent value="jobs">
                  <OverviewChart
                    data={data.jobsTimeseries}
                    series={[
                      { key: "created", label: "Created", color: "hsl(var(--chart-1))" },
                      { key: "completed", label: "Completed", color: "hsl(var(--chart-3))" },
                      { key: "failed", label: "Failed", color: "hsl(var(--chart-5))" },
                    ]}
                  />
                </TabsContent>
                <TabsContent value="credits">
                  <OverviewChart
                    data={data.creditsTimeseries}
                    series={[
                      { key: "granted", label: "Granted", color: "hsl(var(--chart-3))" },
                      { key: "debited", label: "Debited", color: "hsl(var(--chart-4))" },
                      { key: "refunded", label: "Refunded", color: "hsl(var(--chart-2))" },
                    ]}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <Breakdown title="Jobs by status" entries={Object.entries(data.jobsByStatus)} />
                <Breakdown title="Plan distribution" entries={Object.entries(data.plansByTier)} />
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Top orgs by usage
                  </div>
                  <div className="space-y-1.5">
                    {data.topOrgsByUsage.map((t) => (
                      <div key={t.organization.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-foreground">{t.organization.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {t.creditsUsed} cr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="divide-y divide-border">
              {data.recentJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{j.sourceUrl ?? shortId(j.id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {shortId(j.organizationId)} · {fmtDate(j.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Breakdown({ title, entries }: { title: string; entries: [string, number][] }) {
  const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-2">
        {entries.map(([label, n]) => (
          <div key={label}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="capitalize text-foreground">{label}</span>
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
