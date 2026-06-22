"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminSystemInfo } from "@/lib/adminTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Skeleton } from "@/components/ui/shadcn/skeleton";

function modeVariant(v: string): "success" | "warning" {
  // "real" backends (postgres/google/r2/polar/bullmq/real) are green; mocks amber.
  const real = ["postgres", "google", "r2", "polar", "bullmq", "real"];
  return real.includes(v) ? "success" : "warning";
}

export default function AdminSystemPage() {
  const [info, setInfo] = useState<AdminSystemInfo | null>(null);

  useEffect(() => {
    adminApi.getSystem().then(setInfo);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">System</h2>
        <p className="text-sm text-muted-foreground">Resolved runtime mode and subsystems.</p>
      </div>

      {!info ? (
        <Skeleton className="h-48 w-full max-w-xl" />
      ) : (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Runtime</span>
              <Badge variant={info.mockMode ? "warning" : "success"}>
                {info.mockMode ? "MOCK MODE" : "PRODUCTION"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {Object.entries(info.subsystems).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm capitalize text-muted-foreground">{k}</dt>
                  <dd>
                    {typeof v === "boolean" ? (
                      <Badge variant={v ? "success" : "secondary"}>{v ? "on" : "off"}</Badge>
                    ) : (
                      <Badge variant={modeVariant(v)}>{v}</Badge>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Updated {new Date(info.ts).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
