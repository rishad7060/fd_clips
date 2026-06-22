/**
 * Auth mode resolution.
 *
 * Auth.js (Google OAuth) is wired but optional: when NEXT_PUBLIC_AUTH_ENABLED is
 * not "true" we fall back to a dev/mock auth mode so the entire app renders and
 * is clickable without any auth credentials (the local-dev reality from
 * CLAUDE.md). When enabled, the Auth.js provider/components take over.
 *
 * This is a PUBLIC flag (NEXT_PUBLIC_) because client components and the root
 * layout both branch on it; the real OAuth secrets stay server-side.
 */

/** True when real authentication (Auth.js + Google) is configured. */
export const AUTH_ENABLED =
  (process.env.NEXT_PUBLIC_AUTH_ENABLED ?? "").trim().toLowerCase() === "true";

/** The mock user shown in dev mode (no auth configured). */
export const DEV_USER = {
  name: "Demo Creator",
  email: "demo@clips.app",
  initials: "DC",
};
