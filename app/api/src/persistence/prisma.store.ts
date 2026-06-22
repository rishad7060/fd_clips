import { Logger } from '@nestjs/common';
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
}
