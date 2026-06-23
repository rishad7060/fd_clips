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
export type UserRole = 'user' | 'admin';

/** Subscription lifecycle (mirrors the payment provider's status values). */
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export interface OrganizationRecord {
  id: string;
  /** Legacy Clerk/mock org id; null for self-hosted (Google) personal orgs. */
  clerkOrgId: string | null;
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

export interface UserRecord {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  /** Access level. `admin` unlocks the cross-tenant admin dashboard. */
  role: UserRole;
  /** bcrypt hash for Credentials (admin) login; null for Google-only users. */
  passwordHash: string | null;
  lastLoginAt: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/** Google OAuth profile handed to the store when provisioning a user. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
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

/**
 * Editable plan definition (catalog row). Structurally identical to billing's
 * PlanDefinition so the two are interchangeable; lives here because it is now a
 * persisted record the store owns.
 */
export interface PlanRecord {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  watermark: boolean;
  editingEnabled: boolean;
  clipRetentionDays: number | null;
  maxResolution: string;
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

// ── Admin (cross-tenant) ────────────────────────────────────────────────────
// The admin dashboard reads/writes ACROSS organizations. These shapes and the
// admin* methods below are the ONLY place org-scoping is intentionally bypassed;
// they are reachable solely through AdminModule behind AdminGuard.

export interface AdminListParams {
  search?: string;
  /** 1-based page number. */
  page?: number;
  /** Capped (<=100) by the controller DTO. */
  pageSize?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrganizationWithCounts extends OrganizationRecord {
  userCount: number;
  jobCount: number;
}

export interface TimePoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  [series: string]: number | string;
}

export interface AdminOverviewStats {
  totals: {
    organizations: number;
    users: number;
    jobs: number;
    clips: number;
    /** Sum of all orgs' current credit balances. */
    creditsOutstanding: number;
  };
  jobsByStatus: Record<JobStatus, number>;
  plansByTier: Record<PlanTier, number>;
  /** Estimated monthly recurring revenue (active subscriptions × plan price). */
  revenueMrrUsd: number;
  jobsTimeseries: { date: string; created: number; completed: number; failed: number }[];
  creditsTimeseries: { date: string; granted: number; debited: number; refunded: number }[];
  recentJobs: JobRecord[];
  topOrgsByUsage: { organization: OrganizationRecord; jobCount: number; creditsUsed: number }[];
}

/**
 * The single persistence contract. Both the in-memory store (local dev) and
 * the Prisma/Postgres store implement this so callers never branch on mode.
 * All reads/writes are tenant-scoped by organizationId - EXCEPT the admin*
 * methods at the end, which are intentionally cross-tenant.
 */
export interface DataStore {
  init(): Promise<void>;
  shutdown(): Promise<void>;

  // Organizations
  upsertOrganizationByClerkId(clerkOrgId: string, name: string, defaultCredits: number): Promise<OrganizationRecord>;
  getOrganization(id: string): Promise<OrganizationRecord | null>;

  // Users (self-hosted Auth.js + Google). Upserts the user by googleId/email;
  // on first login creates a personal Organization (+ free-tier grant ledger
  // entry) and links the user to it. Idempotent across repeat logins.
  provisionUserByGoogleId(
    profile: GoogleProfile,
    defaultCredits: number,
  ): Promise<{ user: UserRecord; organization: OrganizationRecord }>;
  /**
   * Email+password registration (basic users). Creates a personal Organization
   * (+ free-tier grant ledger entry) and a `user`-role account carrying the
   * given bcrypt hash. Returns null if the email is already registered.
   */
  registerUserWithPassword(
    input: { email: string; name: string; passwordHash: string },
    defaultCredits: number,
  ): Promise<{ user: UserRecord; organization: OrganizationRecord } | null>;
  getUser(id: string): Promise<UserRecord | null>;
  setOrganizationPlan(id: string, plan: PlanTier): Promise<OrganizationRecord>;
  /** Look up an org by its subscription id (webhook handling). */
  getOrganizationBySubscriptionId(subscriptionId: string): Promise<OrganizationRecord | null>;
  /** Persist the subscription id + status on an org. */
  setOrganizationSubscription(
    id: string,
    subscriptionId: string | null,
    status: SubscriptionStatus | null,
  ): Promise<OrganizationRecord>;

  // Plans (editable catalog). Seeded from defaults by PlansService on boot.
  listPlans(): Promise<PlanRecord[]>;
  savePlan(plan: PlanRecord): Promise<PlanRecord>;

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

  // ── Admin (cross-tenant) ──────────────────────────────────────────────────
  adminGetOverview(rangeDays: number): Promise<AdminOverviewStats>;
  adminListOrganizations(p: AdminListParams): Promise<Paged<OrganizationWithCounts>>;
  adminGetOrganization(orgId: string): Promise<OrganizationWithCounts | null>;
  adminListUsers(p: AdminListParams): Promise<Paged<UserRecord>>;
  adminListJobs(
    p: AdminListParams & { status?: JobStatus; organizationId?: string },
  ): Promise<Paged<JobRecord>>;
  adminListClips(
    p: AdminListParams & { organizationId?: string; jobId?: string },
  ): Promise<Paged<ClipRecord>>;
  adminListLedgerAll(
    p: AdminListParams & { organizationId?: string },
  ): Promise<Paged<CreditLedgerRecord>>;
  /** Credentials login lookup - returns the full record incl. passwordHash. */
  adminGetUserByEmail(email: string): Promise<UserRecord | null>;
  adminSetUserRole(userId: string, role: UserRole): Promise<UserRecord | null>;
  adminTouchLogin(userId: string): Promise<void>;
  adminCancelJob(jobId: string): Promise<JobRecord | null>;
  adminDeleteUser(userId: string): Promise<boolean>;
  adminDeleteOrganization(orgId: string): Promise<boolean>;
  adminDeleteJob(jobId: string): Promise<boolean>;
  adminDeleteClip(clipId: string): Promise<boolean>;
}

export const DATA_STORE = Symbol('DATA_STORE');
