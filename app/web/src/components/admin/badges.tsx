import { Badge } from "@/components/ui/shadcn/badge";
import type { JobStatus, PlanTier, UserRole } from "@/lib/adminTypes";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  queued: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
  canceled: "outline",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

const PLAN_VARIANT: Record<PlanTier, "default" | "secondary" | "success"> = {
  free: "secondary",
  starter: "default",
  pro: "success",
};

export function PlanBadge({ plan }: { plan: PlanTier }) {
  return <Badge variant={PLAN_VARIANT[plan]}>{plan}</Badge>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={role === "admin" ? "default" : "outline"}>{role}</Badge>;
}
