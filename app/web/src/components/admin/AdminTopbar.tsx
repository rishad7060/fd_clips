"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { AUTH_ENABLED } from "@/lib/auth";
import { USING_MOCK_ADMIN } from "@/lib/adminApi";
import { Button } from "@/components/ui/shadcn/button";

export function AdminTopbar({ name }: { name?: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-3 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Welcome back{name ? `, ${name}` : ""}
        </h1>
        <p className="text-xs text-muted-foreground">
          System administration · {USING_MOCK_ADMIN ? "offline fixtures" : "live API"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary sm:flex">
          {(name ?? "A").slice(0, 1).toUpperCase()}
        </div>
        {AUTH_ENABLED ? (
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/admin/sign-in" })}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        ) : (
          <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            dev mode
          </span>
        )}
      </div>
    </header>
  );
}
