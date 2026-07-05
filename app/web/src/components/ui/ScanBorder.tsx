import type { ReactNode } from "react";

/**
 * Opus-style "scanning" loading outline: while `active`, a bright white light
 * traces around the rounded box. The `.scan-border` layer spins a conic-gradient
 * (via transform; see globals.css) and is masked to a thin ring by the inset
 * solid inner layer - so only the ~1px edge shows the moving light. When inactive
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
      {/* Content sits above on its OWN OPAQUE surface - this is what masks the
          spinning conic-gradient to just the thin p-px edge. Without an opaque
          fill here, the rotating light bleeds through the whole interior and
          reads as a big rotating box shape. bg-ink-950 matches the app surface. */}
      <div className={`relative ${radius} bg-ink-950`}>{children}</div>
    </div>
  );
}
