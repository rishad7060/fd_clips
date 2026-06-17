import type { ReactNode } from "react";

/**
 * Opus-style "scanning" loading outline: while `active`, a bright white light
 * traces around the rounded box. The `.scan-border` layer spins a conic-gradient
 * (via transform; see globals.css) and is masked to a thin ring by the inset
 * solid inner layer — so only the ~1px edge shows the moving light. When inactive
 * it's a plain hairline border (no animation, no cost).
 */
export function ScanBorder({
  active,
  children,
  className = "",
  radius = "rounded-xl",
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  radius?: string;
}) {
  if (!active) {
    return <div className={`${radius} border border-white/10 ${className}`}>{children}</div>;
  }
  return (
    <div className={`relative ${radius} p-px ${className}`}>
      {/* rotating light ring (the border) */}
      <div className={`scan-border pointer-events-none absolute inset-0 ${radius}`} aria-hidden />
      {/* faint base ring so the unlit part of the outline is still visible */}
      <div className={`pointer-events-none absolute inset-0 ${radius} ring-1 ring-inset ring-white/10`} aria-hidden />
      {/* content sits above, on its own solid surface */}
      <div className={`relative ${radius}`}>{children}</div>
    </div>
  );
}
