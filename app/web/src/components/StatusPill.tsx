import type { JobStatus } from "@/lib/types";

const STYLES: Record<JobStatus, string> = {
  queued: "bg-ink-800 text-ink-300 ring-white/10",
  running: "bg-brand/15 text-brand-300 ring-brand/40",
  completed: "bg-success-500/15 text-success-300 ring-success-500/40",
  failed: "bg-danger-500/15 text-danger-300 ring-danger-500/40",
  canceled: "bg-ink-800 text-ink-400 ring-white/10",
};

const LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

export function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES[status]}`}
    >
      {status === "running" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {LABEL[status]}
    </span>
  );
}
