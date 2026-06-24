"use client";

import { openCookiePreferences } from "@/lib/consent";

/**
 * Footer trigger that reopens the cookie-preferences panel. A client button so
 * it can live inside server-rendered footers (landing, legal) - it just
 * dispatches the window event the ConsentManager listens for. Styled to match
 * the sibling footer links passed via className.
 */
export function CookiePreferencesLink({
  className = "",
  children = "Cookie preferences",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      {children}
    </button>
  );
}
