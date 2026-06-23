"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Megaphone, X } from "lucide-react";
import { getPlatformStatus } from "@/lib/platformStatus";
import type { PlatformStatus } from "@/lib/adminTypes";

/**
 * Top-of-app banners driven by the admin platform controls:
 *  - a maintenance notice (when maintenance mode is on), and
 *  - a dismissible announcement (keyed by content so a new message re-shows).
 * Renders nothing until the status loads, and never throws into the app shell.
 */
export function PlatformBanner() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPlatformStatus()
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus(null));
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  const showAnnouncement =
    status.announcement.trim().length > 0 && dismissed !== status.announcement;

  if (!status.maintenanceMode && !showAnnouncement) return null;

  return (
    <div className="space-y-2 px-4 pt-4 sm:px-6">
      {status.maintenanceMode && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Maintenance in progress.</span>{" "}
            {status.maintenanceMessage}
          </p>
        </div>
      )}

      {showAnnouncement && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="flex-1">{status.announcement}</p>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setDismissed(status.announcement)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
