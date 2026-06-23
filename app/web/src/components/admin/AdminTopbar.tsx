"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Settings, Bell, LogOut, ArrowLeftToLine } from "lucide-react";
import { AUTH_ENABLED } from "@/lib/auth";
import { USING_MOCK_ADMIN } from "@/lib/adminApi";
import { Button } from "@/components/ui/shadcn/button";

/** Map the current admin path to a human breadcrumb leaf. */
function sectionLabel(pathname: string): string {
  if (pathname === "/admin") return "Overview";
  const seg = pathname.split("/").filter(Boolean)[1] ?? "Overview";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function AdminTopbar({ name }: { name?: string | null }) {
  const pathname = usePathname();
  const section = sectionLabel(pathname);

  return (
    <header className="sticky top-3 z-30 flex items-center justify-between gap-4 rounded-2xl border border-border bg-popover/60 px-5 py-3 shadow-card backdrop-blur">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Admin console</span>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">{section}</span>
        </div>
        <h1 className="mt-0.5 truncate text-base font-semibold text-foreground">
          Welcome back{name ? `, ${name}` : ""}
          <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
            · {USING_MOCK_ADMIN ? "offline fixtures" : "live API"}
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton href="/admin/system" label="System settings">
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
        </IconButton>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <div
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/25 sm:flex"
          aria-hidden
        >
          {(name ?? "A").slice(0, 1).toUpperCase()}
        </div>

        {AUTH_ENABLED ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/dashboard" })}
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeftToLine className="h-4 w-4" /> Exit to app
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

/** Square icon control — links when `href` is given, otherwise an inert button. */
function IconButton({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls}>
      {children}
    </button>
  );
}
