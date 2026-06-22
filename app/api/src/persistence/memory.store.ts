import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ClipRecord,
  CreateClipInput,
  CreateJobInput,
  CreditLedgerRecord,
  CreditReason,
  DataStore,
  GoogleProfile,
  JobRecord,
  OrganizationRecord,
  PlanTier,
  SubscriptionStatus,
  UserRecord,
} from './store.types';

const now = (): string => new Date().toISOString();
const id = (): string => randomUUID();

/**
 * In-memory DataStore for local dev (no Postgres). Data is non-persistent and
 * resets on restart. Implements the exact same contract as the Prisma store.
 */
export class MemoryStore implements DataStore {
  private readonly logger = new Logger(MemoryStore.name);
  private readonly orgs = new Map<string, OrganizationRecord>();
  private readonly orgsByClerk = new Map<string, string>();
  private readonly users = new Map<string, UserRecord>();
  private readonly usersByGoogle = new Map<string, string>();
  private readonly usersByEmail = new Map<string, string>();
  private readonly jobs = new Map<string, JobRecord>();
  private readonly clips = new Map<string, ClipRecord>();
  private readonly ledger: CreditLedgerRecord[] = [];

  async init(): Promise<void> {
    this.logger.log('In-memory data store ready (data is ephemeral).');
  }

  async shutdown(): Promise<void> {
    this.orgs.clear();
    this.users.clear();
    this.usersByGoogle.clear();
    this.usersByEmail.clear();
    this.jobs.clear();
    this.clips.clear();
    this.ledger.length = 0;
  }

  async upsertOrganizationByClerkId(
    clerkOrgId: string,
    name: string,
    defaultCredits: number,
  ): Promise<OrganizationRecord> {
    const existingId = this.orgsByClerk.get(clerkOrgId);
    if (existingId) {
      return this.orgs.get(existingId)!;
    }
    const org: OrganizationRecord = {
      id: id(),
      clerkOrgId,
      name,
      plan: 'free',
      creditBalance: defaultCredits,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.orgs.set(org.id, org);
    this.orgsByClerk.set(clerkOrgId, org.id);
    this.ledger.push({
      id: id(),
      organizationId: org.id,
      amount: defaultCredits,
      reason: 'grant',
      jobId: null,
      stripeEventId: null,
      note: 'Free tier signup grant',
      createdAt: now(),
    });
    return org;
  }

  async getOrganization(orgId: string): Promise<OrganizationRecord | null> {
    return this.orgs.get(orgId) ?? null;
  }

  async provisionUserByGoogleId(
    profile: GoogleProfile,
    defaultCredits: number,
  ): Promise<{ user: UserRecord; organization: OrganizationRecord }> {
    // Find an existing user by googleId, falling back to email (so a user who
    // signed up once is reused even if the lookup key shifts).
    const existingId =
      this.usersByGoogle.get(profile.googleId) ?? this.usersByEmail.get(profile.email);
    if (existingId) {
      const user = this.users.get(existingId)!;
      // Keep the profile fresh on repeat logins.
      user.name = profile.name ?? user.name;
      user.avatarUrl = profile.avatarUrl ?? user.avatarUrl;
      user.googleId = profile.googleId ?? user.googleId;
      user.updatedAt = now();
      this.usersByGoogle.set(profile.googleId, user.id);
      return { user, organization: this.orgs.get(user.organizationId)! };
    }

    // First login: create a personal org (+ free-tier grant) and the user.
    const orgName = profile.name ? `${profile.name}'s workspace` : profile.email;
    const org: OrganizationRecord = {
      id: id(),
      clerkOrgId: null,
      name: orgName,
      plan: 'free',
      creditBalance: defaultCredits,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.orgs.set(org.id, org);
    this.ledger.push({
      id: id(),
      organizationId: org.id,
      amount: defaultCredits,
      reason: 'grant',
      jobId: null,
      stripeEventId: null,
      note: 'Free tier signup grant',
      createdAt: now(),
    });

    const user: UserRecord = {
      id: id(),
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      organizationId: org.id,
      createdAt: now(),
      updatedAt: now(),
    };
    this.users.set(user.id, user);
    this.usersByGoogle.set(profile.googleId, user.id);
    this.usersByEmail.set(profile.email, user.id);
    return { user, organization: org };
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async setOrganizationPlan(orgId: string, plan: PlanTier): Promise<OrganizationRecord> {
    const org = this.orgs.get(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found`);
    org.plan = plan;
    org.updatedAt = now();
    return org;
  }

  async getOrganizationBySubscriptionId(
    subscriptionId: string,
  ): Promise<OrganizationRecord | null> {
    for (const org of this.orgs.values()) {
      if (org.subscriptionId === subscriptionId) return org;
    }
    return null;
  }

  async setOrganizationSubscription(
    orgId: string,
    subscriptionId: string | null,
    status: SubscriptionStatus | null,
  ): Promise<OrganizationRecord> {
    const org = this.orgs.get(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found`);
    org.subscriptionId = subscriptionId;
    org.subscriptionStatus = status;
    org.updatedAt = now();
    return org;
  }

  async addCredits(
    organizationId: string,
    amount: number,
    reason: CreditReason,
    meta?: { jobId?: string; stripeEventId?: string; note?: string },
  ): Promise<OrganizationRecord> {
    const org = this.orgs.get(organizationId);
    if (!org) throw new Error(`Organization ${organizationId} not found`);
    org.creditBalance += amount;
    org.updatedAt = now();
    this.ledger.push({
      id: id(),
      organizationId,
      amount,
      reason,
      jobId: meta?.jobId ?? null,
      stripeEventId: meta?.stripeEventId ?? null,
      note: meta?.note ?? null,
      createdAt: now(),
    });
    return org;
  }

  async listLedger(organizationId: string): Promise<CreditLedgerRecord[]> {
    return this.ledger
      .filter((l) => l.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createJob(input: CreateJobInput): Promise<JobRecord> {
    const job: JobRecord = {
      id: id(),
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      sourceKey: input.sourceKey ?? null,
      clipCount: input.clipCount,
      style: input.style ?? null,
      config: input.config ?? null,
      status: 'queued',
      progress: 0,
      stage: 'ingest',
      creditsCharged: input.creditsCharged,
      error: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async getJob(organizationId: string, jobId: string): Promise<JobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.organizationId !== organizationId) return null;
    return job;
  }

  async listJobs(organizationId: string): Promise<JobRecord[]> {
    return [...this.jobs.values()]
      .filter((j) => j.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateJob(
    organizationId: string,
    jobId: string,
    patch: Partial<Pick<JobRecord, 'status' | 'stage' | 'progress' | 'error'>>,
  ): Promise<JobRecord | null> {
    const job = await this.getJob(organizationId, jobId);
    if (!job) return null;
    Object.assign(job, patch, { updatedAt: now() });
    return job;
  }

  async createClip(input: CreateClipInput): Promise<ClipRecord> {
    const clip: ClipRecord = {
      id: id(),
      organizationId: input.organizationId,
      jobId: input.jobId,
      rank: input.rank,
      start: input.start,
      end: input.end,
      hookLine: input.hookLine,
      hookTitle: input.hookTitle ?? null,
      viralityScore: input.viralityScore,
      reason: input.reason,
      suggestedTitle: input.suggestedTitle,
      finalKey: input.finalKey ?? null,
      thumbKey: input.thumbKey ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.clips.set(clip.id, clip);
    return clip;
  }

  async listClips(organizationId: string, jobId?: string): Promise<ClipRecord[]> {
    return [...this.clips.values()]
      .filter((c) => c.organizationId === organizationId && (jobId ? c.jobId === jobId : true))
      .sort((a, b) => a.rank - b.rank);
  }

  async updateClip(
    organizationId: string,
    clipId: string,
    patch: Partial<Pick<ClipRecord, 'start' | 'end'>>,
  ): Promise<ClipRecord | null> {
    const clip = this.clips.get(clipId);
    if (!clip || clip.organizationId !== organizationId) return null;
    const updated = { ...clip, ...patch, updatedAt: now() };
    this.clips.set(clipId, updated);
    return updated;
  }
}
