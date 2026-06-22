/**
 * Storage-agnostic record shapes. These mirror the Prisma models but are
 * plain objects so the in-memory store and the Postgres store share one
 * interface (DataStore). The HTTP layer maps these to camelCase DTOs.
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
export type JobStage = 'ingest' | 'transcribe' | 'score' | 'extract' | 'reframe' | 'captions' | 'done';
export type SourceType = 'url' | 'upload';
export type PlanTier = 'free' | 'starter' | 'pro';
export type CreditReason = 'grant' | 'debit' | 'refund';

/** Subscription lifecycle (mirrors the payment provider's status values). */
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export interface OrganizationRecord {
  id: string;
  clerkOrgId: string;
  name: string;
  plan: PlanTier;
  creditBalance: number;
  stripeCustomerId: string | null;
  /** Provider (Polar.sh) recurring subscription id; null = no active subscription. */
  subscriptionId: string | null;
  /** Last-known subscription status; null before any subscription. */
  subscriptionStatus: SubscriptionStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  organizationId: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceKey: string | null;
  clipCount: number;
  style: Record<string, unknown> | null;
  /**
   * Opus-style per-job clip-generation config (aspectRatio, clipLength, genre,
   * includeMoments, processRange). Null = all defaults (current behavior). The
   * worker forwards this to run.py --config-json (snake_case).
   */
  config: Record<string, unknown> | null;
  status: JobStatus;
  progress: number;
  stage: JobStage;
  creditsCharged: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClipRecord {
  id: string;
  organizationId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  /** Short punchy on-screen hook for the gallery banner (≤~6 words). */
  hookTitle?: string | null;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  finalKey: string | null;
  thumbKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditLedgerRecord {
  id: string;
  organizationId: string;
  amount: number;
  reason: CreditReason;
  jobId: string | null;
  stripeEventId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateJobInput {
  organizationId: string;
  sourceType: SourceType;
  sourceUrl?: string | null;
  sourceKey?: string | null;
  clipCount: number;
  style?: Record<string, unknown> | null;
  /** Opus-style per-job config (aspectRatio/clipLength/genre/includeMoments/processRange). */
  config?: Record<string, unknown> | null;
  creditsCharged: number;
}

export interface CreateClipInput {
  organizationId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  hookTitle?: string | null;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  finalKey?: string | null;
  thumbKey?: string | null;
}

/**
 * The single persistence contract. Both the in-memory store (local dev) and
 * the Prisma/Postgres store implement this so callers never branch on mode.
 * All reads/writes are tenant-scoped by organizationId.
 */
export interface DataStore {
  init(): Promise<void>;
  shutdown(): Promise<void>;

  // Organizations
  upsertOrganizationByClerkId(clerkOrgId: string, name: string, defaultCredits: number): Promise<OrganizationRecord>;
  getOrganization(id: string): Promise<OrganizationRecord | null>;
  setOrganizationPlan(id: string, plan: PlanTier): Promise<OrganizationRecord>;
  /** Look up an org by its subscription id (webhook handling). */
  getOrganizationBySubscriptionId(subscriptionId: string): Promise<OrganizationRecord | null>;
  /** Persist the subscription id + status on an org. */
  setOrganizationSubscription(
    id: string,
    subscriptionId: string | null,
    status: SubscriptionStatus | null,
  ): Promise<OrganizationRecord>;

  // Credits (atomic balance + ledger entry)
  addCredits(
    organizationId: string,
    amount: number,
    reason: CreditReason,
    meta?: { jobId?: string; stripeEventId?: string; note?: string },
  ): Promise<OrganizationRecord>;
  listLedger(organizationId: string): Promise<CreditLedgerRecord[]>;

  // Jobs
  createJob(input: CreateJobInput): Promise<JobRecord>;
  getJob(organizationId: string, jobId: string): Promise<JobRecord | null>;
  listJobs(organizationId: string): Promise<JobRecord[]>;
  updateJob(
    organizationId: string,
    jobId: string,
    patch: Partial<Pick<JobRecord, 'status' | 'stage' | 'progress' | 'error'>>,
  ): Promise<JobRecord | null>;

  // Clips
  createClip(input: CreateClipInput): Promise<ClipRecord>;
  listClips(organizationId: string, jobId?: string): Promise<ClipRecord[]>;
  updateClip(
    organizationId: string,
    clipId: string,
    patch: Partial<Pick<ClipRecord, 'start' | 'end'>>,
  ): Promise<ClipRecord | null>;
}

export const DATA_STORE = Symbol('DATA_STORE');
