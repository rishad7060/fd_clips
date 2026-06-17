/** Shimmer skeleton — matches the final layout to avoid layout shift. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/** A 9:16 clip-card skeleton for the gallery/processing screens. */
export function ClipCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[9/16] rounded-2xl" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-8" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
