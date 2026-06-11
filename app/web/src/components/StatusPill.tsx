import type { JobStatus } from "@/lib/types";

const STYLES: Record<JobStatus, string> = {
  queued: "bg-ink-700 text-white/70 ring-ink-600",
  running: "bg-brand/20 text-brand-400 ring-brand/40",
  completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  failed: "bg-red-500/20 text-red-300 ring-red-500/40",
  canceled: "bg-ink-700 text-white/50 ring-ink-600",
};

export function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES[status]}`}
    >
      {status === "running" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}
