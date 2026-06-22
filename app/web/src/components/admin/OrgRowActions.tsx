"use client";

import { useState } from "react";
import { MoreHorizontal, Coins, Layers, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminOrg, PlanTier } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";

const PLANS: PlanTier[] = ["free", "starter", "pro"];

export function OrgRowActions({ org, onChanged }: { org: AdminOrg; onChanged: () => void }) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState<PlanTier>(org.plan);
  const [busy, setBusy] = useState(false);

  async function adjust() {
    setBusy(true);
    try {
      await adminApi.adjustCredits(org.id, Number(amount) || 0, note || undefined);
      setCreditsOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function savePlan() {
    setBusy(true);
    try {
      await adminApi.setPlan(org.id, plan);
      setPlanOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Org actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setCreditsOpen(true)}>
            <Coins className="h-4 w-4" /> Adjust credits
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPlanOpen(true)}>
            <Layers className="h-4 w-4" /> Change plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-300 focus:text-danger-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust credits — {org.name}</DialogTitle>
            <DialogDescription>
              Current balance: {org.creditBalance}. Positive grants, negative refunds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditsOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={adjust} disabled={busy}>
              {busy ? "Saving…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan — {org.name}</DialogTitle>
            <DialogDescription>Overrides the subscription tier directly.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {PLANS.map((p) => (
              <Button
                key={p}
                variant={plan === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPlan(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={busy}>
              {busy ? "Saving…" : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${org.name}?`}
        description="This permanently removes the organization and all its users, jobs, clips and ledger entries. This cannot be undone."
        confirmLabel="Delete organization"
        destructive
        onConfirm={async () => {
          await adminApi.deleteOrganization(org.id);
          onChanged();
        }}
      />
    </>
  );
}
