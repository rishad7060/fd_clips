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

/** A muted panel surface (config sections). */
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-white/10 bg-ink-900/60 shadow-rim ${className}`} {...props} />;
}

/** Section heading inside a panel/page — proper hierarchy (not body-sized). */
export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold tracking-tight text-white ${className}`}>{children}</h2>;
}

/** A small uppercase field label. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs font-medium text-ink-300 ${className}`}>{children}</span>;
}
