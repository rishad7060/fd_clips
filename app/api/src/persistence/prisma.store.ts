import { Logger } from '@nestjs/common';
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
  PlanRecord,
  PlanTier,
  SubscriptionStatus,
  UserRecord,
  UserRole,
} from './store.types';
import { PLANS } from '../billing/plans';

/**
 * Prisma/Postgres DataStore (real mode, e.g. on the VPS).
 *
 * The @prisma/client module is imported lazily so the API can boot in MOCK
 * mode even when `prisma generate` has not been run. This file is only
 * instantiated when DATABASE_URL is present and MOCK_MODE is not forced.
 */
export class PrismaStore implements DataStore {
  private readonly logger = new Logger(PrismaStore.name);
  // Typed as any: the generated client is only present in real mode.
  private prisma: any;

  constructor(private readonly databaseUrl: string) {}

  async init(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = await import('@prisma/client');
    this.prisma = new PrismaClient({
      datasources: { db: { url: this.databaseUrl } },
    });
    await this.prisma.$connect();
    this.logger.log('Connected to Postgres via Prisma.');
  }

  async shutdown(): Promise<void> {
    if (this.prisma) await this.prisma.$disconnect();
  }

  private toIso(d: Date): string {
    return d.toISOString();
  }

  private mapOrg(o: any): OrganizationRecord {
    return {
      id: o.id,
      clerkOrgId: o.clerkOrgId,
      name: o.name,
      plan: o.plan,
      creditBalance: o.creditBalance,
      stripeCustomerId: o.stripeCustomerId ?? null,
      subscriptionId: o.subscriptionId ?? null,
      subscriptionStatus: (o.subscriptionStatus as SubscriptionStatus | null) ?? null,
      createdAt: this.toIso(o.createdAt),
      updatedAt: this.toIso(o.updatedAt),
    };
  }

  private mapUser(u: any): UserRecord {
    return {
      id: u.id,
      googleId: u.googleId ?? null,
      email: u.email,
      name: u.name ?? null,
      avatarUrl: u.avatarUrl ?? null,
      role: (u.role as UserRole) ?? 'user',
      passwordHash: u.passwordHash ?? null,
      lastLoginAt: u.lastLoginAt ? this.toIso(u.lastLoginAt) : null,
      organizationId: u.organizationId,
      createdAt: this.toIso(u.createdAt),
      updatedAt: this.toIso(u.updatedAt),
    };
  }

  private mapJob(j: any): JobRecord {
    return {
      id: j.id,
      organizationId: j.organizationId,
      sourceType: j.sourceType,
      sourceUrl: j.sourceUrl ?? null,
      sourceKey: j.sourceKey ?? null,
      clipCount: j.clipCount,
      style: (j.style as Record<string, unknown>) ?? null,
      config: (j.config as Record<string, unknown>) ?? null,
      status: j.status,
      progress: j.progress,
      stage: j.stage,
      creditsCharged: j.creditsCharged,
      error: j.error ?? null,
      createdAt: this.toIso(j.createdAt),
      updatedAt: this.toIso(j.updatedAt),
    };
  }

  private mapClip(c: any): ClipRecord {
    return {
      id: c.id,
      organizationId: c.organizationId,
      jobId: c.jobId,
      rank: c.rank,
      start: c.start,
      end: c.end,
      hookLine: c.hookLine,
      hookTitle: c.hookTitle ?? null,
      viralityScore: c.viralityScore,
      reason: c.reason,
      suggestedTitle: c.suggestedTitle,
      finalKey: c.finalKey ?? null,
      thumbKey: c.thumbKey ?? null,
      createdAt: this.toIso(c.createdAt),
      updatedAt: this.toIso(c.updatedAt),
    };
  }

  private mapLedger(l: any): CreditLedgerRecord {
    return {
      id: l.id,
      organizationId: l.organizationId,
      amount: l.amount,
      reason: l.reason,
      jobId: l.jobId ?? null,
      stripeEventId: l.stripeEventId ?? null,
      note: l.note ?? null,
      createdAt: this.toIso(l.createdAt),
    };
  }

  async upsertOrganizationByClerkId(
    clerkOrgId: string,
    name: string,
    defaultCredits: number,
  ): Promise<OrganizationRecord> {
    const existing = await this.prisma.organization.findUnique({ where: { clerkOrgId } });
    if (existing) return this.mapOrg(existing);
    const org = await this.prisma.organization.create({
      data: { clerkOrgId, name, creditBalance: defaultCredits, plan: 'free' },
    });
    await this.prisma.creditLedger.create({
      data: {
        organizationId: org.id,
        amount: defaultCredits,
        reason: 'grant',
        note: 'Free tier signup grant',
      },
    });
    return this.mapOrg(org);
  }

  async getOrganization(orgId: string): Promise<OrganizationRecord | null> {
    const o = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return o ? this.mapOrg(o) : null;
  }

  async provisionUserByGoogleId(
    profile: GoogleProfile,
    defaultCredits: number,
  ): Promise<{ user: UserRecord; organization: OrganizationRecord }> {
    // Reuse an existing user (by googleId, falling back to email), refreshing
    // the cached profile fields on repeat logins.
    const existing =
      (await this.prisma.user.findUnique({ where: { googleId: profile.googleId } })) ??
      (await this.prisma.user.findUnique({ where: { email: profile.email } }));
    if (existing) {
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: profile.googleId,
          name: profile.name ?? existing.name,
          avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        },
      });
      const org = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      return { user: this.mapUser(user), organization: this.mapOrg(org) };
    }

    // First login: create a personal org (+ free-tier grant) and the user in
    // one transaction so a user is never left without an organization.
    const orgName = profile.name ? `${profile.name}'s workspace` : profile.email;
    const { user, org } = await this.prisma.$transaction(async (tx: any) => {
      const org = await tx.organization.create({
        data: { name: orgName, creditBalance: defaultCredits, plan: 'free' },
      });
      await tx.creditLedger.create({
        data: {
          organizationId: org.id,
          amount: defaultCredits,
          reason: 'grant',
          note: 'Free tier signup grant',
        },
      });
      const user = await tx.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          organizationId: org.id,
        },
      });
      return { user, org };
    });
    return { user: this.mapUser(user), organization: this.mapOrg(org) };
  }

  async registerUserWithPassword(
    input: { email: string; name: string; passwordHash: string },
    defaultCredits: number,
  ): Promise<{ user: UserRecord; organization: OrganizationRecord } | null> {
    const email = input.email.trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return null;

    // Create the personal org (+ free-tier grant) and the password user in one
    // transaction so a user is never left without an organization.
    try {
      const { user, org } = await this.prisma.$transaction(async (tx: any) => {
        const org = await tx.organization.create({
          data: {
            name: input.name ? `${input.name}'s workspace` : email,
            creditBalance: defaultCredits,
            plan: 'free',
          },
        });
        await tx.creditLedger.create({
          data: {
            organizationId: org.id,
            amount: defaultCredits,
            reason: 'grant',
            note: 'Free tier signup grant',
          },
        });
        const user = await tx.user.create({
          data: {
            email,
            name: input.name || null,
            passwordHash: input.passwordHash,
            organizationId: org.id,
          },
        });
        return { user, org };
      });
      return { user: this.mapUser(user), organization: this.mapOrg(org) };
    } catch {
      // Unique-constraint race (email taken between the check and the insert).
      return null;
    }
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    return u ? this.mapUser(u) : null;
  }

  async setOrganizationPlan(orgId: string, plan: PlanTier): Promise<OrganizationRecord> {
    const o = await this.prisma.organization.update({ where: { id: orgId }, data: { plan } });
    return this.mapOrg(o);
  }

  async getOrganizationBySubscriptionId(
    subscriptionId: string,
  ): Promise<OrganizationRecord | null> {
    const o = await this.prisma.organization.findUnique({
      where: { subscriptionId },
    });
    return o ? this.mapOrg(o) : null;
  }

  async setOrganizationSubscription(
    orgId: string,
    subscriptionId: string | null,
    status: SubscriptionStatus | null,
  ): Promise<OrganizationRecord> {
    const o = await this.prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionId, subscriptionStatus: status },
    });
    return this.mapOrg(o);
  }

  private mapPlan(p: any): PlanRecord {
    return {
      tier: p.tier,
      label: p.label,
      priceUsd: p.priceUsd,
      monthlyCredits: p.monthlyCredits,
      watermark: p.watermark,
      editingEnabled: p.editingEnabled,
      clipRetentionDays: p.clipRetentionDays ?? null,
      maxResolution: p.maxResolution,
    };
  }

  async listPlans(): Promise<PlanRecord[]> {
    const rows = await this.prisma.plan.findMany();
    return rows.map((r: any) => this.mapPlan(r));
  }

  async savePlan(plan: PlanRecord): Promise<PlanRecord> {
    const data = {
      label: plan.label,
      priceUsd: plan.priceUsd,
      monthlyCredits: plan.monthlyCredits,
      watermark: plan.watermark,
      editingEnabled: plan.editingEnabled,
      clipRetentionDays: plan.clipRetentionDays,
      maxResolution: plan.maxResolution,
    };
    const row = await this.prisma.plan.upsert({
      where: { tier: plan.tier },
      update: data,
      create: { tier: plan.tier, ...data },
    });
    return this.mapPlan(row);
  }

  async addCredits(
    organizationId: string,
    amount: number,
    reason: CreditReason,
    meta?: { jobId?: string; stripeEventId?: string; note?: string },
  ): Promise<OrganizationRecord> {
    // Atomic: balance update + ledger entry in one transaction.
    const [org] = await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: organizationId },
        data: { creditBalance: { increment: amount } },
      }),
      this.prisma.creditLedger.create({
        data: {
          organizationId,
          amount,
          reason,
          jobId: meta?.jobId ?? null,
          stripeEventId: meta?.stripeEventId ?? null,
          note: meta?.note ?? null,
        },
      }),
    ]);
    return this.mapOrg(org);
  }

  async listLedger(organizationId: string): Promise<CreditLedgerRecord[]> {
    const rows = await this.prisma.creditLedger.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => this.mapLedger(r));
  }

  async createJob(input: CreateJobInput): Promise<JobRecord> {
    const job = await this.prisma.job.create({
      data: {
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        sourceKey: input.sourceKey ?? null,
        clipCount: input.clipCount,
        style: (input.style ?? undefined) as any,
        config: (input.config ?? undefined) as any,
        creditsCharged: input.creditsCharged,
      },
    });
    return this.mapJob(job);
  }

  async getJob(organizationId: string, jobId: string): Promise<JobRecord | null> {
    const j = await this.prisma.job.findFirst({ where: { id: jobId, organizationId } });
    return j ? this.mapJob(j) : null;
  }

  async listJobs(organizationId: string): Promise<JobRecord[]> {
    const rows = await this.prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => this.mapJob(r));
  }

  async updateJob(
    organizationId: string,
    jobId: string,
    patch: Partial<Pick<JobRecord, 'status' | 'stage' | 'progress' | 'error'>>,
  ): Promise<JobRecord | null> {
    const result = await this.prisma.job.updateMany({ where: { id: jobId, organizationId }, data: patch });
    if (result.count === 0) return null;
    return this.getJob(organizationId, jobId);
  }

  async createClip(input: CreateClipInput): Promise<ClipRecord> {
    const c = await this.prisma.clip.create({
      data: {
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
      },
    });
    return this.mapClip(c);
  }

  async listClips(organizationId: string, jobId?: string): Promise<ClipRecord[]> {
    const rows = await this.prisma.clip.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) },
      orderBy: { rank: 'asc' },
    });
    return rows.map((r: any) => this.mapClip(r));
  }

  async updateClip(
    organizationId: string,
    clipId: string,
    patch: Partial<Pick<ClipRecord, 'start' | 'end'>>,
  ): Promise<ClipRecord | null> {
    const existing = await this.prisma.clip.findFirst({
      where: { id: clipId, organizationId },
    });
    if (!existing) return null;
    const c = await this.prisma.clip.update({ where: { id: clipId }, data: patch });
    return this.mapClip(c);
  }

  // ── Admin (cross-tenant) ──────────────────────────────────────────────────

  private pageArgs(p: AdminListParams): { skip: number; take: number; page: number; pageSize: number } {
    const page = Math.max(1, p.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, p.pageSize ?? 20));
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
  }

  async adminGetOverview(rangeDays: number): Promise<AdminOverviewStats> {
    const since = new Date(Date.now() - (rangeDays - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);

    const [orgs, userCount, jobCount, clipCount, jobsGrouped, orgsGrouped, recent, jobsInRange, ledgerInRange] =
      await Promise.all([
        this.prisma.organization.findMany(),
        this.prisma.user.count(),
        this.prisma.job.count(),
        this.prisma.clip.count(),
        this.prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.organization.groupBy({ by: ['plan'], _count: { _all: true } }),
        this.prisma.job.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
        this.prisma.job.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, status: true, organizationId: true, creditsCharged: true },
        }),
        this.prisma.creditLedger.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, amount: true, reason: true },
        }),
      ]);

    const jobsByStatus: Record<JobStatus, number> = {
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    };
    for (const g of jobsGrouped) jobsByStatus[g.status as JobStatus] = g._count._all;

    const plansByTier: Record<PlanTier, number> = { free: 0, starter: 0, pro: 0 };
    for (const g of orgsGrouped) plansByTier[g.plan as PlanTier] = g._count._all;

    const revenueMrrUsd = orgs.reduce(
      (sum: number, o: any) =>
        o.subscriptionStatus === 'ACTIVE' ? sum + PLANS[o.plan as PlanTier].priceUsd : sum,
      0,
    );

    const days = this.dateBuckets(rangeDays);
    const jobsTimeseries = days.map((date) => ({ date, created: 0, completed: 0, failed: 0 }));
    const jIndex = new Map(jobsTimeseries.map((d) => [d.date, d]));
    for (const j of jobsInRange) {
      const bucket = jIndex.get(this.toIso(j.createdAt).slice(0, 10));
      if (!bucket) continue;
      bucket.created++;
      if (j.status === 'completed') bucket.completed++;
      if (j.status === 'failed') bucket.failed++;
    }
    const creditsTimeseries = days.map((date) => ({ date, granted: 0, debited: 0, refunded: 0 }));
    const cIndex = new Map(creditsTimeseries.map((d) => [d.date, d]));
    for (const l of ledgerInRange) {
      const bucket = cIndex.get(this.toIso(l.createdAt).slice(0, 10));
      if (!bucket) continue;
      if (l.reason === 'grant') bucket.granted += l.amount;
      else if (l.reason === 'debit') bucket.debited += Math.abs(l.amount);
      else if (l.reason === 'refund') bucket.refunded += l.amount;
    }

    const usageByOrg = new Map<string, { jobCount: number; creditsUsed: number }>();
    for (const j of jobsInRange) {
      const u = usageByOrg.get(j.organizationId) ?? { jobCount: 0, creditsUsed: 0 };
      u.jobCount++;
      u.creditsUsed += j.creditsCharged;
      usageByOrg.set(j.organizationId, u);
    }
    const orgById = new Map(orgs.map((o: any) => [o.id, o]));
    const topOrgsByUsage = [...usageByOrg.entries()]
      .map(([orgId, u]) => ({ organization: orgById.get(orgId), ...u }))
      .filter((x) => x.organization)
      .sort((a, b) => b.creditsUsed - a.creditsUsed)
      .slice(0, 5)
      .map((x) => ({ ...x, organization: this.mapOrg(x.organization) }));

    return {
      totals: {
        organizations: orgs.length,
        users: userCount,
        jobs: jobCount,
        clips: clipCount,
        creditsOutstanding: orgs.reduce((s: number, o: any) => s + o.creditBalance, 0),
      },
      jobsByStatus,
      plansByTier,
      revenueMrrUsd,
      jobsTimeseries,
      creditsTimeseries,
      recentJobs: recent.map((r: any) => this.mapJob(r)),
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

  async adminListOrganizations(p: AdminListParams): Promise<Paged<OrganizationWithCounts>> {
    const { skip, take, page, pageSize } = this.pageArgs(p);
    const where = p.search
      ? { OR: [{ name: { contains: p.search, mode: 'insensitive' } }, { id: { contains: p.search } }] }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, jobs: true } } },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return {
      rows: rows.map((o: any) => ({ ...this.mapOrg(o), userCount: o._count.users, jobCount: o._count.jobs })),
      total,
      page,
      pageSize,
    };
  }

  async adminGetOrganization(orgId: string): Promise<OrganizationWithCounts | null> {
    const o = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { _count: { select: { users: true, jobs: true } } },
    });
    return o ? { ...this.mapOrg(o), userCount: o._count.users, jobCount: o._count.jobs } : null;
  }

  async adminListUsers(p: AdminListParams): Promise<Paged<UserRecord>> {
    const { skip, take, page, pageSize } = this.pageArgs(p);
    const where = p.search
      ? {
          OR: [
            { email: { contains: p.search, mode: 'insensitive' } },
            { name: { contains: p.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { rows: rows.map((u: any) => this.mapUser(u)), total, page, pageSize };
  }

  async adminListJobs(
    p: AdminListParams & { status?: JobStatus; organizationId?: string },
  ): Promise<Paged<JobRecord>> {
    const { skip, take, page, pageSize } = this.pageArgs(p);
    const where: any = {};
    if (p.status) where.status = p.status;
    if (p.organizationId) where.organizationId = p.organizationId;
    if (p.search) where.OR = [{ id: { contains: p.search } }, { sourceUrl: { contains: p.search } }];
    const [rows, total] = await Promise.all([
      this.prisma.job.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.job.count({ where }),
    ]);
    return { rows: rows.map((j: any) => this.mapJob(j)), total, page, pageSize };
  }

  async adminListClips(
    p: AdminListParams & { organizationId?: string; jobId?: string },
  ): Promise<Paged<ClipRecord>> {
    const { skip, take, page, pageSize } = this.pageArgs(p);
    const where: any = {};
    if (p.organizationId) where.organizationId = p.organizationId;
    if (p.jobId) where.jobId = p.jobId;
    if (p.search)
      where.OR = [
        { hookLine: { contains: p.search, mode: 'insensitive' } },
        { suggestedTitle: { contains: p.search, mode: 'insensitive' } },
      ];
    const [rows, total] = await Promise.all([
      this.prisma.clip.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.clip.count({ where }),
    ]);
    return { rows: rows.map((c: any) => this.mapClip(c)), total, page, pageSize };
  }

  async adminListLedgerAll(
    p: AdminListParams & { organizationId?: string },
  ): Promise<Paged<CreditLedgerRecord>> {
    const { skip, take, page, pageSize } = this.pageArgs(p);
    const where: any = {};
    if (p.organizationId) where.organizationId = p.organizationId;
    if (p.search) where.OR = [{ note: { contains: p.search, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      this.prisma.creditLedger.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.creditLedger.count({ where }),
    ]);
    return { rows: rows.map((l: any) => this.mapLedger(l)), total, page, pageSize };
  }

  async adminGetUserByEmail(email: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    return u ? this.mapUser(u) : null;
  }

  async adminSetUserRole(userId: string, role: UserRole): Promise<UserRecord | null> {
    const u = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    return u ? this.mapUser(u) : null;
  }

  async adminTouchLogin(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async adminCancelJob(jobId: string): Promise<JobRecord | null> {
    const j = await this.prisma.job.update({ where: { id: jobId }, data: { status: 'canceled' } });
    return j ? this.mapJob(j) : null;
  }

  async adminDeleteUser(userId: string): Promise<boolean> {
    const r = await this.prisma.user.deleteMany({ where: { id: userId } });
    return r.count > 0;
  }

  async adminDeleteOrganization(orgId: string): Promise<boolean> {
    // Remove dependent rows first (no DB-level cascade defined in the schema).
    await this.prisma.$transaction([
      this.prisma.clip.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.job.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.creditLedger.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.user.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.organization.deleteMany({ where: { id: orgId } }),
    ]);
    return true;
  }

  async adminDeleteJob(jobId: string): Promise<boolean> {
    await this.prisma.$transaction([
      this.prisma.clip.deleteMany({ where: { jobId } }),
      this.prisma.job.deleteMany({ where: { id: jobId } }),
    ]);
    return true;
  }

  async adminDeleteClip(clipId: string): Promise<boolean> {
    const r = await this.prisma.clip.deleteMany({ where: { id: clipId } });
    return r.count > 0;
  }
}
