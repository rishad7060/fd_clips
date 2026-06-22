"use client";

import { useState } from "react";
import { MoreHorizontal, Ban, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminJob } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";

export function JobRowActions({ job, onChanged }: { job: AdminJob; onChanged: () => void }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cancellable = job.status === "queued" || job.status === "running";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Job actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!cancellable} onSelect={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4" /> Cancel job
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-300 focus:text-danger-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this job?"
        description="The job will be marked canceled."
        confirmLabel="Cancel job"
        onConfirm={async () => {
          await adminApi.cancelJob(job.id);
          onChanged();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this job?"
        description="This permanently removes the job and its clips."
        confirmLabel="Delete job"
        destructive
        onConfirm={async () => {
          await adminApi.deleteJob(job.id);
          onChanged();
        }}
      />
    </>
  );
}
