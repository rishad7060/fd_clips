import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import {
  AdminListParams,
  AdminOverviewStats,
  ClipRecord,
  CreateClipInput,
  CreateJobInput,
  CreditLedgerRecord,
  CreditReason,
  DataStore,
  GoogleProfile,
  JobRecord,
  JobStatus,
  OrganizationRecord,
  OrganizationWithCounts,
  Paged,
  PlanTier,
  SubscriptionStatus,
  UserRecord,
  UserRole,
} from './store.types';
import { PLANS } from '../billing/plans';

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
    if ((process.env.MOCK_ADMIN ?? '').toLowerCase() !== 'false') {
      this.seedAdmin();
    }
  }

  /**
   * Seed a system admin + a handful of demo orgs/users/jobs/clips/ledger so the
   * admin dashboard renders against real (in-memory) data in local dev. The
   * admin logs in via the Credentials provider → POST /auth/login, which checks
   * the bcrypt hash below. Disable with MOCK_ADMIN=false.
   */
  private seedAdmin(): void {
    const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@focaldive.local').trim();
    const adminPassword = (
      process.env.MOCK_ADMIN_PASSWORD ??
      process.env.ADMIN_PASSWORD ??
      'changeme-admin'
    ).trim();

    const adminOrg: OrganizationRecord = {
      id: id(),
      clerkOrgId: null,
      name: 'FocalDive Admin',
      plan: 'pro',
      creditBalance: 0,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.orgs.set(adminOrg.id, adminOrg);
    const admin: UserRecord = {
      id: id(),
      googleId: null,
      email: adminEmail,
      name: 'System Admin',
      avatarUrl: null,
      role: 'admin',
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      lastLoginAt: null,
      organizationId: adminOrg.id,
      createdAt: now(),
      updatedAt: now(),
    };
    this.users.set(admin.id, admin);
    this.usersByEmail.set(admin.email, admin.id);
    this.logger.log(`Seeded admin user: ${adminEmail} (MOCK_ADMIN_PASSWORD)`);

    // Demo tenants so the dashboard isn't empty. Deterministic, spread over the
    // last ~21 days for the overview timeseries.
    const demos: { name: string; plan: PlanTier; email: string }[] = [
      { name: "Ava's workspace", plan: 'pro', email: 'ava@example.com' },
      { name: "Liam's workspace", plan: 'starter', email: 'liam@example.com' },
      { name: "Noah's workspace", plan: 'free', email: 'noah@example.com' },
      { name: "Mia's workspace", plan: 'free', email: 'mia@example.com' },
      { name: "Zoe's workspace", plan: 'starter', email: 'zoe@example.com' },
    ];
    const statuses: JobStatus[] = ['completed', 'completed', 'running', 'failed', 'queued'];
    demos.forEach((d, oi) => {
      const created = this.daysAgo(20 - oi * 3);
      const org: OrganizationRecord = {
        id: id(),
        clerkOrgId: null,
        name: d.name,
        plan: d.plan,
        creditBalance: PLANS[d.plan].monthlyCredits - oi * 7,
        stripeCustomerId: null,
        subscriptionId: d.plan === 'free' ? null : `sub_demo_${oi}`,
        subscriptionStatus: d.plan === 'free' ? null : 'ACTIVE',
        createdAt: created,
        updatedAt: created,
      };
      this.orgs.set(org.id, org);
      this.ledger.push({
        id: id(),
        organizationId: org.id,
        amount: PLANS[d.plan].monthlyCredits,
        reason: 'grant',
        jobId: null,
        stripeEventId: null,
        note: `${PLANS[d.plan].label} grant`,
        createdAt: created,
      });
      const user: UserRecord = {
        id: id(),
        googleId: `google_demo_${oi}`,
        email: d.email,
        name: d.name.replace("'s workspace", ''),
        avatarUrl: null,
        role: 'user',
        passwordHash: null,
        lastLoginAt: this.daysAgo(oi),
        organizationId: org.id,
        createdAt: created,
        updatedAt: created,
      };
      this.users.set(user.id, user);
      this.usersByGoogle.set(user.googleId!, user.id);
      this.usersByEmail.set(user.email, user.id);

      // A couple of jobs per org, with clips for completed ones.
      const jobCount = 2 + (oi % 2);
      for (let ji = 0; ji < jobCount; ji++) {
        const jCreated = this.daysAgo(18 - oi * 3 - ji);
        const status = statuses[(oi + ji) % statuses.length];
        const job: JobRecord = {
          id: id(),
          organizationId: org.id,
          sourceType: 'url',
          sourceUrl: `https://youtu.be/demo${oi}${ji}`,
          sourceKey: null,
          clipCount: 6,
          style: null,
          config: null,
          status,
          progress: status === 'completed' ? 100 : status === 'running' ? 45 : 0,
          stage: status === 'completed' ? 'done' : 'transcribe',
          creditsCharged: 12,
          error: status === 'failed' ? 'Mock failure (demo)' : null,
          createdAt: jCreated,
          updatedAt: jCreated,
        };
        this.jobs.set(job.id, job);
        this.ledger.push({
          id: id(),
          organizationId: org.id,
          amount: -12,
          reason: 'debit',
          jobId: job.id,
          stripeEventId: null,
          note: 'Job submit',
          createdAt: jCreated,
        });
        if (status === 'completed') {
          for (let r = 1; r <= 4; r++) {
            const clip: ClipRecord = {
              id: id(),
              organizationId: org.id,
              jobId: job.id,
              rank: r,
              start: r * 30,
              end: r * 30 + 28,
              hookLine: `Demo hook ${r} for ${user.name}`,
              hookTitle: `Hook ${r}`,
              viralityScore: 95 - r * 7 - oi,
              reason: 'High retention + strong hook (demo).',
              suggestedTitle: `Demo clip ${r}`,
              finalKey: null,
              thumbKey: null,
              createdAt: jCreated,
              updatedAt: jCreated,
            };
            this.clips.set(clip.id, clip);
          }
        }
      }
    });
  }

  private daysAgo(n: number): string {
    return new Date(Date.now() - n * 86_400_000).toISOString();
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
      role: 'user',
      passwordHash: null,
      lastLoginAt: null,
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

  // ── Admin (cross-tenant) ──────────────────────────────────────────────────

  private paginate<T>(rows: T[], p: AdminListParams): Paged<T> {
    const page = Math.max(1, p.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, p.pageSize ?? 20));
    const start = (page - 1) * pageSize;
    return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  private matches(haystack: (string | null | undefined)[], search?: string): boolean {
    if (!search) return true;
    const q = search.toLowerCase();
    return haystack.some((h) => (h ?? '').toLowerCase().includes(q));
  }

  async adminGetOverview(rangeDays: number): Promise<AdminOverviewStats> {
    const orgs = [...this.orgs.values()];
    const users = [...this.users.values()];
    const jobs = [...this.jobs.values()];
    const clips = [...this.clips.values()];

    const jobsByStatus: Record<JobStatus, number> = {
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    };
    for (const j of jobs) jobsByStatus[j.status]++;

    const plansByTier: Record<PlanTier, number> = { free: 0, starter: 0, pro: 0 };
    for (const o of orgs) plansByTier[o.plan]++;

    const revenueMrrUsd = orgs.reduce(
      (sum, o) =>
        o.subscriptionStatus === 'ACTIVE' ? sum + PLANS[o.plan].priceUsd : sum,
      0,
    );

    // Build per-day buckets over the range.
    const days = this.dateBuckets(rangeDays);
    const jobsTimeseries = days.map((date) => ({ date, created: 0, completed: 0, failed: 0 }));
    const jIndex = new Map(jobsTimeseries.map((d) => [d.date, d]));
    for (const j of jobs) {
      const key = j.createdAt.slice(0, 10);
      const bucket = jIndex.get(key);
      if (bucket) {
        bucket.created++;
        if (j.status === 'completed') bucket.completed++;
        if (j.status === 'failed') bucket.failed++;
      }
    }
    const creditsTimeseries = days.map((date) => ({ date, granted: 0, debited: 0, refunded: 0 }));
    const cIndex = new Map(creditsTimeseries.map((d) => [d.date, d]));
    for (const l of this.ledger) {
      const bucket = cIndex.get(l.createdAt.slice(0, 10));
      if (!bucket) continue;
      if (l.reason === 'grant') bucket.granted += l.amount;
      else if (l.reason === 'debit') bucket.debited += Math.abs(l.amount);
      else if (l.reason === 'refund') bucket.refunded += l.amount;
    }

    const recentJobs = [...jobs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);

    const usageByOrg = new Map<string, { jobCount: number; creditsUsed: number }>();
    for (const j of jobs) {
      const u = usageByOrg.get(j.organizationId) ?? { jobCount: 0, creditsUsed: 0 };
      u.jobCount++;
      u.creditsUsed += j.creditsCharged;
      usageByOrg.set(j.organizationId, u);
    }
    const topOrgsByUsage = [...usageByOrg.entries()]
      .map(([orgId, u]) => ({ organization: this.orgs.get(orgId)!, ...u }))
      .filter((x) => x.organization)
      .sort((a, b) => b.creditsUsed - a.creditsUsed)
      .slice(0, 5);

    return {
      totals: {
        organizations: orgs.length,
        users: users.length,
        jobs: jobs.length,
        clips: clips.length,
        creditsOutstanding: orgs.reduce((s, o) => s + o.creditBalance, 0),
      },
      jobsByStatus,
      plansByTier,
      revenueMrrUsd,
      jobsTimeseries,
      creditsTimeseries,
      recentJobs,
      topOrgsByUsage,
    };
  }

  private dateBuckets(rangeDays: number): string[] {
    const out: string[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      out.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    }
    return out;
  }

  private withCounts(org: OrganizationRecord): OrganizationWithCounts {
    let userCount = 0;
    for (const u of this.users.values()) if (u.organizationId === org.id) userCount++;
    let jobCount = 0;
    for (const j of this.jobs.values()) if (j.organizationId === org.id) jobCount++;
    return { ...org, userCount, jobCount };
  }

  async adminListOrganizations(p: AdminListParams): Promise<Paged<OrganizationWithCounts>> {
    const rows = [...this.orgs.values()]
      .filter((o) => this.matches([o.name, o.id, o.plan], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => this.withCounts(o));
    return this.paginate(rows, p);
  }

  async adminGetOrganization(orgId: string): Promise<OrganizationWithCounts | null> {
    const org = this.orgs.get(orgId);
    return org ? this.withCounts(org) : null;
  }

  async adminListUsers(p: AdminListParams): Promise<Paged<UserRecord>> {
    const rows = [...this.users.values()]
      .filter((u) => this.matches([u.email, u.name, u.id, u.role], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.paginate(rows, p);
  }

  async adminListJobs(
    p: AdminListParams & { status?: JobStatus; organizationId?: string },
  ): Promise<Paged<JobRecord>> {
    const rows = [...this.jobs.values()]
      .filter((j) => (p.status ? j.status === p.status : true))
      .filter((j) => (p.organizationId ? j.organizationId === p.organizationId : true))
      .filter((j) => this.matches([j.id, j.sourceUrl, j.organizationId], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.paginate(rows, p);
  }

  async adminListClips(
    p: AdminListParams & { organizationId?: string; jobId?: string },
  ): Promise<Paged<ClipRecord>> {
    const rows = [...this.clips.values()]
      .filter((c) => (p.organizationId ? c.organizationId === p.organizationId : true))
      .filter((c) => (p.jobId ? c.jobId === p.jobId : true))
      .filter((c) => this.matches([c.hookLine, c.suggestedTitle, c.id], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.paginate(rows, p);
  }

  async adminListLedgerAll(
    p: AdminListParams & { organizationId?: string },
  ): Promise<Paged<CreditLedgerRecord>> {
    const rows = this.ledger
      .filter((l) => (p.organizationId ? l.organizationId === p.organizationId : true))
      .filter((l) => this.matches([l.note, l.organizationId, l.reason], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.paginate(rows, p);
  }

  async adminGetUserByEmail(email: string): Promise<UserRecord | null> {
    const userId = this.usersByEmail.get(email);
    return userId ? this.users.get(userId) ?? null : null;
  }

  async adminSetUserRole(userId: string, role: UserRole): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.role = role;
    user.updatedAt = now();
    return user;
  }

  async adminTouchLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = now();
      user.updatedAt = now();
    }
  }

  async adminCancelJob(jobId: string): Promise<JobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'canceled';
    job.updatedAt = now();
    return job;
  }

  async adminDeleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    this.users.delete(userId);
    this.usersByEmail.delete(user.email);
    if (user.googleId) this.usersByGoogle.delete(user.googleId);
    return true;
  }

  async adminDeleteOrganization(orgId: string): Promise<boolean> {
    const org = this.orgs.get(orgId);
    if (!org) return false;
    this.orgs.delete(orgId);
    if (org.clerkOrgId) this.orgsByClerk.delete(org.clerkOrgId);
    for (const [uid, u] of this.users) if (u.organizationId === orgId) await this.adminDeleteUser(uid);
    for (const [jid, j] of this.jobs) if (j.organizationId === orgId) this.jobs.delete(jid);
    for (const [cid, c] of this.clips) if (c.organizationId === orgId) this.clips.delete(cid);
    for (let i = this.ledger.length - 1; i >= 0; i--) {
      if (this.ledger[i].organizationId === orgId) this.ledger.splice(i, 1);
    }
    return true;
  }

  async adminDeleteJob(jobId: string): Promise<boolean> {
    if (!this.jobs.has(jobId)) return false;
    this.jobs.delete(jobId);
    for (const [cid, c] of this.clips) if (c.jobId === jobId) this.clips.delete(cid);
    return true;
  }

  async adminDeleteClip(clipId: string): Promise<boolean> {
    return this.clips.delete(clipId);
  }
}
