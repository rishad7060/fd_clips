"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Film,
  Coins,
  Layers,
  Server,
  LogOut,
  ArrowLeftToLine,
} from "lucide-react";
import { AUTH_ENABLED } from "@/lib/auth";
import { cn } from "@/lib/cn";

/** Primary management destinations + the group they belong to (for rail dividers). */
const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, group: 0 },
  { href: "/admin/users", label: "Users", icon: Users, group: 1 },
  { href: "/admin/organizations", label: "Organizations", icon: Building2, group: 1 },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase, group: 1 },
  { href: "/admin/clips", label: "Clips", icon: Film, group: 1 },
  { href: "/admin/credits", label: "Credits", icon: Coins, group: 2 },
  { href: "/admin/plans", label: "Plans", icon: Layers, group: 2 },
  { href: "/admin/system", label: "System", icon: Server, group: 2 },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[76px] shrink-0 flex-col items-center rounded-2xl border border-border bg-popover/60 py-4 shadow-card md:flex">
      {/* Brand emblem - the app logo, cropped to its gradient mark (the 533×533
          square that sits at the left of the full lockup) for the narrow rail. */}
      <Link
        href="/admin"
        aria-label="FocalDive Clips - Admin"
        className="block h-11 w-11 overflow-hidden rounded-xl shadow-glow transition hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/label-logo.svg" alt="Clips" className="h-full w-auto max-w-none" draggable={false} />
      </Link>

      <nav className="mt-6 flex flex-1 flex-col items-center gap-1.5">
        {NAV.map(({ href, label, icon: Icon, group }, i) => {
          const active = isActive(href);
          const newGroup = i > 0 && group !== NAV[i - 1]!.group;
          return (
            <div key={href} className="flex flex-col items-center">
              {newGroup && <span className="my-1.5 h-px w-7 bg-border" aria-hidden />}
              <RailLink href={href} label={label} active={active}>
                <Icon className="h-[18px] w-[18px]" />
              </RailLink>
            </div>
          );
        })}
      </nav>

      {/* Exit / logout - pinned to the bottom like the reference rail */}
      <div className="mt-4 flex flex-col items-center gap-1.5">
        <span className="my-1 h-px w-7 bg-border" aria-hidden />
        <RailButton
          label="Back to app"
          onClick={() => {
            // Leave the console for the user app without ending the session.
            window.location.href = "/dashboard";
          }}
        >
          <ArrowLeftToLine className="h-[18px] w-[18px]" />
        </RailButton>
        {AUTH_ENABLED && (
          <RailButton
            label="Log out"
            danger
            onClick={() => signOut({ callbackUrl: "/dashboard" })}
          >
            <LogOut className="h-[18px] w-[18px]" />
          </RailButton>
        )}
      </div>
    </aside>
  );
}

/* ── Rail primitives: a 44px target with a hover tooltip that names the item ── */

function RailLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative grid h-11 w-11 place-items-center rounded-xl transition-colors",
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
      <Tooltip label={label} />
    </Link>
  );
}

function RailButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group relative grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent",
        danger ? "hover:text-danger-300" : "hover:text-foreground",
      )}
    >
      {children}
      <Tooltip label={label} />
    </button>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}
