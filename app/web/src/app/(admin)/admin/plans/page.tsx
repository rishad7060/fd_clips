"use client";

import { useEffect, useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminPlan } from "@/lib/adminTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Skeleton } from "@/components/ui/shadcn/skeleton";
import { fmtUsd } from "@/components/admin/format";
import { EditPlanDialog } from "@/components/admin/EditPlanDialog";

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {on ? (
        <Check className="h-4 w-4 text-success-400" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  useEffect(() => {
    adminApi.getPlans().then(setPlans);
  }, []);

  function onSaved(updated: AdminPlan) {
    setPlans((prev) => prev?.map((p) => (p.tier === updated.tier ? updated : p)) ?? prev);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Plans</h2>
        <p className="text-sm text-muted-foreground">
          Subscription tiers and capabilities — edits apply live across billing and credit grants.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {!plans
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)
          : plans.map((p) => (
              <Card key={p.tier}>
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between">
                    <span className="capitalize">{p.label}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {p.priceUsd === 0 ? "Free" : `${fmtUsd(p.priceUsd)}/mo`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-semibold tabular-nums text-foreground">
                    {p.monthlyCredits}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">credits/mo</span>
                  </div>
                  <ul className="space-y-1.5">
                    <Flag on={!p.watermark} label="No watermark" />
                    <Flag on={p.editingEnabled} label="In-app editing" />
                    <Flag
                      on={p.clipRetentionDays === null}
                      label={p.clipRetentionDays === null ? "Indefinite retention" : `${p.clipRetentionDays}-day retention`}
                    />
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success-400" />
                      {p.maxResolution}
                    </li>
                  </ul>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" /> Edit plan
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      {editing ? (
        <EditPlanDialog
          plan={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}
