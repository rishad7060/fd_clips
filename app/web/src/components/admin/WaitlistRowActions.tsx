"use client";

import { useState } from "react";
import { CheckCircle2, Clock, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminWaitlistEntry, WaitlistStatus } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";

const NEXT_STATUS: { value: WaitlistStatus; label: string; icon: typeof Send }[] = [
  { value: "pending", label: "Mark pending", icon: Clock },
  { value: "invited", label: "Mark invited", icon: Send },
  { value: "converted", label: "Mark converted", icon: CheckCircle2 },
];

export function WaitlistRowActions({
  entry,
  onChanged,
}: {
  entry: AdminWaitlistEntry;
  onChanged: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Waitlist entry actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {NEXT_STATUS.filter((s) => s.value !== entry.status).map((s) => (
            <DropdownMenuItem
              key={s.value}
              onSelect={async () => {
                await adminApi.setWaitlistStatus(entry.id, s.value);
                onChanged();
              }}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-300 focus:text-danger-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${entry.email}?`}
        description="This permanently removes the waitlist signup. This cannot be undone."
        confirmLabel="Delete entry"
        destructive
        onConfirm={async () => {
          await adminApi.deleteWaitlistEntry(entry.id);
          onChanged();
        }}
      />
    </>
  );
}
