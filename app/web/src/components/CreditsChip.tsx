"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { onCreditsChanged } from "@/lib/creditsBus";
import { Button } from "@/components/ui/Button";
import type { CreditBalance } from "@/lib/types";

/**
 * Opus-style credits chip for the top bar: a lightning bolt + remaining credits,
 * plus an "Add credits" button. Fetches GET /billing/balance (real or mock).
 * Shows a shimmer while loading and a quiet "-" fallback on error so the chip
 * never vanishes (the top bar shouldn't break if billing is unreachable).
 *
 * The chip lives in the persistent shell, so it re-fetches whenever the balance
 * could have changed: on every route change, when a purchase/cancel pings the
 * credits bus, and when the tab is refocused. Without this it would keep showing
 * the value from first mount (e.g. 60 after upgrading to a 150-credit plan).
 */
export function CreditsChip() {
  const [bal, setBal] = useState<CreditBalance | null>(null);
  const [failed, setFailed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      api
        .getBalance()
        .then((b) => {
          if (alive) {
            setBal(b);
            setFailed(false);
          }
        })
        .catch(() => alive && setFailed(true));
    };

    refresh();
    const off = onCreditsChanged(refresh);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      off();
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <div className="flex items-center gap-2">
      <span
        title={bal ? `${bal.credit_balance} of ${bal.monthly_credits} min remaining · ${bal.plan} plan` : "Credits"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1.5 text-sm font-semibold text-white shadow-rim"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-400" fill="currentColor" aria-hidden>
          <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
        </svg>
        {bal ? (
          <span className="font-mono tabular-nums">{bal.credit_balance}</span>
        ) : failed ? (
          <span className="font-mono tabular-nums text-ink-400">-</span>
        ) : (
          <span className="inline-block h-3 w-4 animate-pulse rounded bg-ink-700" />
        )}
      </span>
      {/* Button is a <button>; wrap a Link for navigation while keeping the one button system. */}
      <Link href="/billing" className="inline-flex">
        <Button variant="secondary" size="sm">Add credits</Button>
      </Link>
    </div>
  );
}
