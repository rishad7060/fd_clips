import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { JOB_QUEUE, JobQueue } from '../queue/queue.types';
import { PLANS } from '../billing/plans';
import {
  AdminListParams,
  DataStore,
  DATA_STORE,
  JobStatus,
  PlanTier,
  UserRecord,
  UserRole,
} from '../persistence/store.types';

/** UserRecord without the password hash — what the admin API ever returns. */
export type SafeUser = Omit<UserRecord, 'passwordHash'>;

/**
 * Orchestration for the cross-tenant admin dashboard. Thin layer over the
 * DataStore admin* methods + the plan catalog + resolved feature flags. Strips
 * password hashes from any user it returns.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly config: AppConfigService,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
  ) {}

  private safeUser(u: UserRecord): SafeUser {
    const { passwordHash: _omit, ...rest } = u;
    return rest;
  }

  overview(rangeDays = 30) {
    return this.store.adminGetOverview(rangeDays);
  }

  listOrganizations(p: AdminListParams) {
    return this.store.adminListOrganizations(p);
  }

  async getOrganization(orgId: string) {
    const org = await this.store.adminGetOrganization(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async listUsers(p: AdminListParams) {
    const page = await this.store.adminListUsers(p);
    return { ...page, rows: page.rows.map((u) => this.safeUser(u)) };
  }

  listJobs(p: AdminListParams & { status?: JobStatus; organizationId?: string }) {
    return this.store.adminListJobs(p);
  }

  listClips(p: AdminListParams & { organizationId?: string; jobId?: string }) {
    return this.store.adminListClips(p);
  }

  listLedger(p: AdminListParams & { organizationId?: string }) {
    return this.store.adminListLedgerAll(p);
  }

  async setUserRole(userId: string, role: UserRole): Promise<SafeUser> {
    const user = await this.store.adminSetUserRole(userId, role);
    if (!user) throw new NotFoundException('User not found');
    return this.safeUser(user);
  }

  async adjustCredits(orgId: string, amount: number, note?: string) {
    const reason = amount >= 0 ? 'grant' : 'refund';
    return this.store.addCredits(orgId, amount, reason, {
      note: note ?? `Admin ${reason} (${amount})`,
    });
  }

  setOrgPlan(orgId: string, plan: PlanTier) {
    return this.store.setOrganizationPlan(orgId, plan);
  }

  async cancelJob(jobId: string) {
    const job = await this.store.adminCancelJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async deleteUser(userId: string) {
    const ok = await this.store.adminDeleteUser(userId);
    if (!ok) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  async deleteOrganization(orgId: string) {
    await this.store.adminDeleteOrganization(orgId);
    return { deleted: true };
  }

  async deleteJob(jobId: string) {
    await this.store.adminDeleteJob(jobId);
    return { deleted: true };
  }

  async deleteClip(clipId: string) {
    const ok = await this.store.adminDeleteClip(clipId);
    if (!ok) throw new NotFoundException('Clip not found');
    return { deleted: true };
  }

  plans() {
    return Object.values(PLANS);
  }

  system() {
    const f = this.config.flags;
    return {
      mockMode: f.mockMode,
      subsystems: {
        auth: f.mockAuth ? 'mock' : 'google',
        database: f.mockDb ? 'in-memory' : 'postgres',
        queue: this.queue.backend,
        storage: f.mockStorage ? 'mock' : 'r2',
        billing: f.mockBilling ? 'mock' : 'polar',
        pipeline: f.useRealPipeline ? 'real' : 'mock',
        localFiles: f.localFiles,
      },
      ts: new Date().toISOString(),
    };
  }
}
