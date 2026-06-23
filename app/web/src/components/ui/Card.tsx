import type { HTMLAttributes } from "react";

/** Premium card surface: hairline border + top-rim highlight. */
export function Card({ className = "", interactive = false, ...props }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-ink-850 shadow-rim ${
        interactive ? "transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800 hover:shadow-lift" : ""
      } ${className}`}
      {...props}
    />
  );
}

/**
 * Frosted-glass panel surface for config sections (Opus-style): a low-opacity
 * background with a soft backdrop blur so the page shows through, and a subtle
 * dim-until-hover - its contents sit slightly muted at rest and brighten when
 * the cursor is over the section, so the active area "wakes up".
 */
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`group/panel rounded-2xl border border-white/10 bg-ink-900/45 shadow-rim backdrop-blur-md transition-[opacity,background-color] duration-300 ease-premium opacity-[0.92] hover:bg-ink-900/60 hover:opacity-100 ${className}`}
      {...props}
    />
  );
}

/** Section heading inside a panel/page - proper hierarchy (not body-sized). */
export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold tracking-tight text-white ${className}`}>{children}</h2>;
}

/** A small uppercase field label. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs font-medium text-ink-300 ${className}`}>{children}</span>;
}
