"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONSENT_CATEGORIES,
  OPEN_PREFERENCES_EVENT,
  acceptAll,
  readConsent,
  rejectAll,
  saveConsent,
  type OptionalCategory,
} from "@/lib/consent";

type Choices = Record<OptionalCategory, boolean>;

const ALL_OFF: Choices = { functional: false, analytics: false, marketing: false };

/**
 * Global cookie-consent gate. Shows a dismissible banner until the visitor
 * makes a choice, and a detailed preferences panel (also reachable later via
 * the footer "Cookie preferences" link). Mounted once in the root layout.
 *
 * Compliant defaults: optional categories start OFF, "Reject all" is given the
 * same prominence as "Accept all", and the choice persists for a year in the
 * `fd_consent` cookie. Renders nothing once a choice exists and the panel is
 * closed.
 */
export function ConsentManager() {
  // `null` until mounted so SSR and first client render agree (no hydration
  // mismatch); then we know whether a decision already exists.
  const [decided, setDecided] = useState<boolean | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [choices, setChoices] = useState<Choices>(ALL_OFF);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Hydrate from the stored cookie and listen for "open preferences" requests.
  useEffect(() => {
    const existing = readConsent();
    setDecided(existing !== null);
    setChoices(
      existing
        ? {
            functional: existing.functional,
            analytics: existing.analytics,
            marketing: existing.marketing,
          }
        : ALL_OFF,
    );
    const open = () => {
      const cur = readConsent();
      setChoices(
        cur
          ? {
              functional: cur.functional,
              analytics: cur.analytics,
              marketing: cur.marketing,
            }
          : ALL_OFF,
      );
      setPanelOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, []);

  const close = useCallback(() => setPanelOpen(false), []);

  // Esc closes the panel; focus the close button when it opens.
  useEffect(() => {
    if (!panelOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, close]);

  const acceptAllNow = useCallback(() => {
    acceptAll(Date.now());
    setDecided(true);
    setPanelOpen(false);
  }, []);

  const rejectAllNow = useCallback(() => {
    rejectAll(Date.now());
    setDecided(true);
    setPanelOpen(false);
  }, []);

  const saveChoices = useCallback(() => {
    saveConsent(choices, Date.now());
    setDecided(true);
    setPanelOpen(false);
  }, [choices]);

  // Before hydration we don't know the state - render nothing to avoid a flash.
  if (decided === null) return null;
  const showBanner = !decided && !panelOpen;
  if (!showBanner && !panelOpen) return null;

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-md rounded-2xl border border-white/10 bg-ink-850/95 p-5 shadow-rim backdrop-blur supports-[backdrop-filter]:bg-ink-850/80 sm:bottom-4 sm:left-4 sm:right-auto"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-300">
              <Cookie className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">We value your privacy</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">
                We use essential cookies to run Clips, and optional cookies to
                improve it. Choose what you&rsquo;re comfortable with. See our{" "}
                <a href="/privacy" className="text-brand-300 underline-offset-2 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={acceptAllNow}>
              Accept all
            </Button>
            <Button size="sm" variant="secondary" onClick={rejectAllNow}>
              Reject all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPanelOpen(true)}
              className="ml-auto"
            >
              Preferences
            </Button>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close cookie preferences"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 shadow-rim sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand-300">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <h2 id="cookie-prefs-title" className="text-base font-semibold text-white">
                    Cookie preferences
                  </h2>
                  <p className="text-xs text-ink-400">
                    Manage how Clips uses cookies. You can change this anytime.
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {/* Necessary - always on, locked. */}
              <CategoryRow
                label="Strictly necessary"
                description="Required for sign-in, security, and core features. These can't be turned off."
                checked
                locked
              />
              {CONSENT_CATEGORIES.map((c) => (
                <CategoryRow
                  key={c.key}
                  label={c.label}
                  description={c.description}
                  checked={choices[c.key]}
                  onChange={(v) =>
                    setChoices((prev) => ({ ...prev, [c.key]: v }))
                  }
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] p-5">
              <Button size="sm" variant="primary" onClick={saveChoices}>
                Save preferences
              </Button>
              <Button size="sm" variant="secondary" onClick={rejectAllNow}>
                Reject all
              </Button>
              <Button size="sm" variant="ghost" onClick={acceptAllNow} className="ml-auto">
                Accept all
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryRow({
  label,
  description,
  checked,
  onChange,
  locked = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (value: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-ink-850 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} locked={locked} label={label} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  locked = false,
  label,
}: {
  checked: boolean;
  onChange?: (value: boolean) => void;
  locked?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={locked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900",
        checked ? "bg-brand" : "bg-ink-700",
        locked ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
