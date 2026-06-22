"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

/** First two initials from a name or email, for the fallback avatar. */
function initialsOf(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

/**
 * Auth.js (Google) user controls. Shows the signed-in user's avatar/name with a
 * sign-out action, or a "Sign in" link when signed out. Mounted only when auth
 * is enabled (inside SessionProvider), so useSession always has a provider.
 */
export function SessionControls() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="h-9 w-9 animate-pulse rounded-full bg-white/10" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Sign in
      </Link>
    );
  }

  const name = session.user.name ?? session.user.email ?? "Account";
  const email = session.user.email ?? "";
  const image = session.user.image ?? null;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-medium text-white">{name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="block text-xs text-ink-500 hover:text-white"
        >
          Sign out
        </button>
      </span>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-cyan-500 text-sm font-bold text-white"
          title={email || name}
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
