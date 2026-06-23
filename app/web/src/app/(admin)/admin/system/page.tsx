"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Megaphone, Pause, UserPlus } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminSystemInfo, PlatformSettings } from "@/lib/adminTypes";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { Skeleton } from "@/components/ui/shadcn/skeleton";

function modeVariant(v: string): "success" | "warning" {
  // "real" backends (postgres/google/r2/polar/bullmq/real) are green; mocks amber.
  const real = ["postgres", "google", "r2", "polar", "bullmq", "real"];
  return real.includes(v) ? "success" : "warning";
}

/**
 * Overall runtime status derived from the resolved subsystems rather than the
 * blunt global `mockMode` flag (which reads "MOCK MODE" if even one dependency
 * is missing). Counts the string-valued backends (auth/db/queue/storage/billing/
 * pipeline) and reports PRODUCTION / PARTIAL / MOCK MODE accordingly.
 */
function runtimeStatus(subsystems: AdminSystemInfo["subsystems"]): {
  label: string;
  variant: "success" | "warning";
  live: number;
  total: number;
} {
  const services = Object.values(subsystems).filter(
    (v): v is string => typeof v === "string",
  );
  const live = services.filter((v) => modeVariant(v) === "success").length;
  const total = services.length;
  if (total > 0 && live === total)
    return { label: "PRODUCTION", variant: "success", live, total };
  if (live === 0) return { label: "MOCK MODE", variant: "warning", live, total };
  return { label: "PARTIAL", variant: "warning", live, total };
}

/** Accessible on/off switch (no shadcn switch primitive in this project). */
function Switch({
  checked,
  onChange,
  disabled,
  danger,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? (danger ? "bg-destructive" : "bg-primary") : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function ControlRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PlatformControls() {
  const [saved, setSaved] = useState<PlatformSettings | null>(null);
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getPlatformSettings().then((s) => {
      setSaved(s);
      setDraft(s);
    });
  }, []);

  if (!draft || !saved) return <Skeleton className="h-72 w-full" />;

  const dirty =
    draft.maintenanceMode !== saved.maintenanceMode ||
    draft.maintenanceMessage !== saved.maintenanceMessage ||
    draft.newJobsEnabled !== saved.newJobsEnabled ||
    draft.signupsEnabled !== saved.signupsEnabled ||
    draft.announcement !== saved.announcement;

  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setConfirmation(null);
    setError(null);
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  async function save() {
    if (!draft || !dirty) return;
    setBusy(true);
    setError(null);
    setConfirmation(null);
    try {
      const next = await adminApi.setPlatformSettings({
        maintenanceMode: draft.maintenanceMode,
        maintenanceMessage: draft.maintenanceMessage,
        newJobsEnabled: draft.newJobsEnabled,
        signupsEnabled: draft.signupsEnabled,
        announcement: draft.announcement,
      });
      setSaved(next);
      setDraft(next);
      setConfirmation("Platform controls updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Platform controls</span>
          {draft.maintenanceMode ? (
            <Badge variant="destructive">MAINTENANCE</Badge>
          ) : (
            <Badge variant="success">LIVE</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Operate the platform without a redeploy. Changes take effect immediately.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          <ControlRow
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Maintenance mode"
            description="Locks the app for non-admins and shows the maintenance message."
          >
            <Switch
              checked={draft.maintenanceMode}
              onChange={(v) => set("maintenanceMode", v)}
              disabled={busy}
              danger
            />
          </ControlRow>

          {draft.maintenanceMode && (
            <div className="py-3.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="maint-msg">
                Maintenance message
              </label>
              <Input
                id="maint-msg"
                className="mt-1.5"
                maxLength={280}
                value={draft.maintenanceMessage}
                onChange={(e) => set("maintenanceMessage", e.target.value)}
                placeholder="We'll be back shortly…"
                disabled={busy}
              />
            </div>
          )}

          <ControlRow
            icon={<Pause className="h-4 w-4" />}
            title="Accept new clip jobs"
            description="When off, new job submissions are rejected (worker maintenance, capacity limits)."
          >
            <Switch
              checked={draft.newJobsEnabled}
              onChange={(v) => set("newJobsEnabled", v)}
              disabled={busy}
            />
          </ControlRow>

          <ControlRow
            icon={<UserPlus className="h-4 w-4" />}
            title="Allow new sign-ups"
            description="When off, new account registration is closed."
          >
            <Switch
              checked={draft.signupsEnabled}
              onChange={(v) => set("signupsEnabled", v)}
              disabled={busy}
            />
          </ControlRow>

          <div className="py-3.5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground" htmlFor="announcement">
                Announcement banner
              </label>
            </div>
            <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
              Shown to every signed-in user across the app. Leave empty to hide.
            </p>
            <Input
              id="announcement"
              maxLength={280}
              value={draft.announcement}
              onChange={(e) => set("announcement", e.target.value)}
              placeholder="e.g. New: vertical reframe is 2× faster this week 🎉"
              disabled={busy}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : confirmation ? (
              <span className="text-emerald-500">{confirmation}</span>
            ) : (
              `Updated ${new Date(saved.updatedAt).toLocaleString()}`
            )}
          </p>
          <Button onClick={save} disabled={!dirty || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSystemPage() {
  const [info, setInfo] = useState<AdminSystemInfo | null>(null);

  useEffect(() => {
    adminApi.getSystem().then(setInfo);
  }, []);

  const status = info ? runtimeStatus(info.subsystems) : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">System</h2>
        <p className="text-sm text-muted-foreground">
          Platform controls and resolved runtime mode.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <PlatformControls />
        </div>

        <div className="lg:col-span-2">
          {!info || !status ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Runtime</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {status.live} of {status.total} subsystems on real backends.
                </p>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  {Object.entries(info.subsystems).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-2.5">
                      <dt className="text-sm capitalize text-muted-foreground">{k}</dt>
                      <dd>
                        {typeof v === "boolean" ? (
                          <Badge variant={v ? "success" : "secondary"}>{v ? "on" : "off"}</Badge>
                        ) : (
                          <Badge variant={modeVariant(v)}>{v}</Badge>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Updated {new Date(info.ts).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
