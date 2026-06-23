/**
 * Wire shapes for the admin API (app/api/src/admin). The admin endpoints return
 * the store records directly, which are already camelCase - so unlike the
 * creator api.ts there is no snake_case normalization here.
 */

export type JobStatus = "queued" | "running" | "completed" | "failed" | "canceled";
export type JobStage =
  | "ingest"
  | "transcribe"
  | "score"
  | "extract"
  | "reframe"
  | "captions"
  | "done";
export type PlanTier = "free" | "starter" | "pro";
export type UserRole = "user" | "admin";
export type CreditReason = "grant" | "debit" | "refund";

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOrg {
  id: string;
  name: string;
  plan: PlanTier;
  creditBalance: number;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  userCount: number;
  jobCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  lastLoginAt: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJob {
  id: string;
  organizationId: string;
  sourceType: "url" | "upload";
  sourceUrl: string | null;
  clipCount: number;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  creditsCharged: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminClip {
  id: string;
  organizationId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  hookTitle?: string | null;
  viralityScore: number;
  suggestedTitle: string;
  createdAt: string;
}

export interface AdminLedgerEntry {
  id: string;
  organizationId: string;
  amount: number;
  reason: CreditReason;
  jobId: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminOverview {
  totals: {
    organizations: number;
    users: number;
    jobs: number;
    clips: number;
    creditsOutstanding: number;
  };
  jobsByStatus: Record<JobStatus, number>;
  plansByTier: Record<PlanTier, number>;
  revenueMrrUsd: number;
  jobsTimeseries: { date: string; created: number; completed: number; failed: number }[];
  creditsTimeseries: { date: string; granted: number; debited: number; refunded: number }[];
  recentJobs: AdminJob[];
  topOrgsByUsage: { organization: AdminOrg; jobCount: number; creditsUsed: number }[];
}

export interface AdminPlan {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  watermark: boolean;
  editingEnabled: boolean;
  clipRetentionDays: number | null;
  maxResolution: string;
}

/** Editable fields of a plan (tier is immutable). */
export type PlanPatch = Partial<Omit<AdminPlan, "tier">>;

export interface AdminSystemInfo {
  mockMode: boolean;
  subsystems: {
    auth: string;
    database: string;
    queue: string;
    storage: string;
    billing: string;
    pipeline: string;
    localFiles: boolean;
  };
  ts: string;
}

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  organizationId?: string;
  jobId?: string;
}
