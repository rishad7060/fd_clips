/**
 * Auth mode resolution.
 *
 * Clerk is wired but optional: if no publishable key is present we fall back to
 * a dev/mock auth mode so the entire app renders and is clickable without any
 * Clerk credentials (the local-dev reality from CLAUDE.md). When real keys are
 * supplied, the Clerk provider/components take over.
 */

export const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";

/** True when real Clerk keys are configured. */
export const CLERK_ENABLED =
  CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/** The mock user shown in dev mode (no Clerk). */
export const DEV_USER = {
  name: "Demo Creator",
  email: "demo@clips.app",
  initials: "DC",
};
