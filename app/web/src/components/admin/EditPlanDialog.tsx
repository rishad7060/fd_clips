"use client";

import { useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminPlan, PlanPatch } from "@/lib/adminTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { cn } from "@/lib/cn";

function Toggle({
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, label: onLabel },
        { v: false, label: offLabel },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === o.v
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EditPlanDialog({
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: AdminPlan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (p: AdminPlan) => void;
}) {
  const [label, setLabel] = useState(plan.label);
  const [price, setPrice] = useState(String(plan.priceUsd));
  const [credits, setCredits] = useState(String(plan.monthlyCredits));
  const [watermark, setWatermark] = useState(plan.watermark);
  const [editing, setEditing] = useState(plan.editingEnabled);
  const [retention, setRetention] = useState(
    plan.clipRetentionDays === null ? "" : String(plan.clipRetentionDays),
  );
  const [maxRes, setMaxRes] = useState(plan.maxResolution);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const patch: PlanPatch = {
        label: label.trim() || plan.label,
        priceUsd: Number(price) || 0,
        monthlyCredits: Math.max(0, Math.round(Number(credits) || 0)),
        watermark,
        editingEnabled: editing,
        clipRetentionDays: retention.trim() === "" ? null : Math.max(0, Math.round(Number(retention))),
        maxResolution: maxRes.trim() || plan.maxResolution,
      };
      const saved = await adminApi.updatePlan(plan.tier, patch);
      onSaved(saved);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {plan.label} plan</DialogTitle>
          <DialogDescription>
            Changes apply live across billing, credit grants and the public plans list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (USD/mo)</Label>
            <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credits">Monthly credits</Label>
            <Input id="credits" type="number" value={credits} onChange={(e) => setCredits(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxres">Max resolution</Label>
            <Input id="maxres" value={maxRes} onChange={(e) => setMaxRes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Watermark</Label>
            <Toggle value={watermark} onChange={setWatermark} onLabel="On" offLabel="Off" />
          </div>
          <div className="space-y-1.5">
            <Label>In-app editing</Label>
            <Toggle value={editing} onChange={setEditing} onLabel="Enabled" offLabel="Disabled" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="retention">Clip retention (days — blank = indefinite)</Label>
            <Input
              id="retention"
              type="number"
              value={retention}
              placeholder="indefinite"
              onChange={(e) => setRetention(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
