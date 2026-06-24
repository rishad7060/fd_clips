// Cookie-consent model + storage. Framework-agnostic (no React) so it can be
// read from anywhere: the consent UI, ReferralCapture, or a future analytics
// loader. The choice is persisted in a first-party cookie - so it survives
// reloads and is readable server-side if ever needed - and every change is
// broadcast on a window event so live consumers react without a reload.

export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "marketing";

export type OptionalCategory = Exclude<ConsentCategory, "necessary">;

export interface ConsentState {
  /** Always granted - the app (auth/session/security) can't run without it. */
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  /** Schema version - bump CONSENT_VERSION to force re-consent on changes. */
  v: number;
  /** Epoch ms the choice was recorded. */
  ts: number;
}

/** Bump when the categories/meaning change so prior consent is re-requested. */
export const CONSENT_VERSION = 1;
export const CONSENT_COOKIE = "fd_consent";
/** Dispatched on `window` whenever the stored choice changes. */
export const CONSENT_EVENT = "fd-consent-change";
/** Dispatched on `window` to ask the ConsentManager to open its panel. */
export const OPEN_PREFERENCES_EVENT = "fd-open-cookie-preferences";
const ONE_YEAR = 365 * 24 * 60 * 60;

/** Imperatively open the cookie-preferences panel from anywhere on the client. */
export function openCookiePreferences(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
  }
}

/** The toggleable categories, in display order, with the copy the UI shows. */
export const CONSENT_CATEGORIES: {
  key: OptionalCategory;
  label: string;
  description: string;
}[] = [
  {
    key: "functional",
    label: "Functional",
    description:
      "Remember your preferences and settings so the app feels the same each visit.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Help us understand how the product is used so we can improve it. Aggregated, never sold.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description:
      "Measure campaigns and attribute referrals - for example, an affiliate link you arrived from.",
  },
];

function makeState(optIn: boolean): ConsentState {
  return {
    necessary: true,
    functional: optIn,
    analytics: optIn,
    marketing: optIn,
    v: CONSENT_VERSION,
    ts: 0,
  };
}

/**
 * Read the stored consent, or null when the visitor hasn't chosen yet (or the
 * stored choice predates the current CONSENT_VERSION and must be re-collected).
 */
export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)),
    ) as Partial<ConsentState>;
    if (parsed.v !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      functional: !!parsed.functional,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      v: CONSENT_VERSION,
      ts: typeof parsed.ts === "number" ? parsed.ts : 0,
    };
  } catch {
    return null;
  }
}

/** True once the visitor has made any choice at this consent version. */
export function hasDecided(): boolean {
  return readConsent() !== null;
}

/**
 * Whether a given category is permitted. `necessary` is always true; every
 * other category is false until explicitly granted (deny-by-default, the
 * compliant stance for GDPR/ePrivacy).
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const state = readConsent();
  return state ? !!state[category] : false;
}

function persist(state: ConsentState): ConsentState {
  if (typeof document !== "undefined") {
    const value = encodeURIComponent(JSON.stringify(state));
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  }
  return state;
}

/** Save an explicit per-category choice (necessary is always forced on). */
export function saveConsent(
  prefs: Partial<Record<OptionalCategory, boolean>>,
  now = 0,
): ConsentState {
  return persist({
    necessary: true,
    functional: !!prefs.functional,
    analytics: !!prefs.analytics,
    marketing: !!prefs.marketing,
    v: CONSENT_VERSION,
    ts: now,
  });
}

export function acceptAll(now = 0): ConsentState {
  return persist({ ...makeState(true), ts: now });
}

export function rejectAll(now = 0): ConsentState {
  return persist({ ...makeState(false), ts: now });
}

/**
 * Subscribe to consent changes (fires on save in this tab). Returns an
 * unsubscribe function. SSR-safe no-op when there's no window.
 */
export function onConsentChange(
  cb: (state: ConsentState) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
