"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminClip } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import { ConfirmDialog } from "./ConfirmDialog";

export function ClipRowActions({ clip, onChanged }: { clip: AdminClip; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Delete clip" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-danger-300" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this clip?"
        description="This permanently removes the clip record."
        confirmLabel="Delete clip"
        destructive
        onConfirm={async () => {
          await adminApi.deleteClip(clip.id);
          onChanged();
        }}
      />
    </>
  );
}
