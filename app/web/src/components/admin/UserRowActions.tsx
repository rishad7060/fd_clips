"use client";

import { useState } from "react";
import { MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminUser } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";

export function UserRowActions({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const makeAdmin = user.role !== "admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="User actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRoleOpen(true)}>
            {makeAdmin ? (
              <>
                <ShieldCheck className="h-4 w-4" /> Make admin
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" /> Revoke admin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-300 focus:text-danger-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        title={makeAdmin ? `Promote ${user.email}?` : `Revoke admin from ${user.email}?`}
        description={
          makeAdmin
            ? "This grants full cross-tenant admin access to the dashboard."
            : "This removes admin access. Existing tokens remain valid until they expire."
        }
        confirmLabel={makeAdmin ? "Make admin" : "Revoke admin"}
        onConfirm={async () => {
          await adminApi.setUserRole(user.id, makeAdmin ? "admin" : "user");
          onChanged();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${user.email}?`}
        description="This permanently removes the user. Their organization and data are not deleted."
        confirmLabel="Delete user"
        destructive
        onConfirm={async () => {
          await adminApi.deleteUser(user.id);
          onChanged();
        }}
      />
    </>
  );
}
