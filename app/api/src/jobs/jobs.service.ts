import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { DataStore, DATA_STORE, JobRecord } from '../persistence/store.types';
import { JOB_QUEUE, JobQueue, JobQueuePayload } from '../queue/queue.types';
import { CreateJobDto } from './dto/create-job.dto';

/**
 * Job lifecycle: validate credits → debit → persist → enqueue.
 * Credit cost is source-minutes (1 credit = 1 source-minute). If enqueue
 * fails the debit is refunded so credits are never silently lost.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
    private readonly billing: BillingService,
  ) {}

  async create(organizationId: string, dto: CreateJobDto): Promise<JobRecord> {
    const credits = this.billing.creditsForDuration(dto.durationSec ?? 0);

    // 1) Persist the job first (status=queued) so the ledger can reference it.
    const job = await this.store.createJob({
      organizationId,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl ?? null,
      sourceKey: dto.sourceKey ?? null,
      clipCount: dto.clipCount,
      style: dto.style ?? null,
      creditsCharged: credits,
    });

    // 2) Validate + debit credits (throws if insufficient). Mark the job
    // failed if the debit is rejected so it is not left dangling as queued.
    try {
      await this.billing.debitForJob(organizationId, credits, job.id);
    } catch (err) {
      await this.store.updateJob(organizationId, job.id, {
        status: 'failed',
        error: (err as Error).message,
      });
      throw err;
    }

    // 3) Enqueue for the worker (snake_case payload — CONTRACTS.md §1).
    const payload: JobQueuePayload = {
      job_id: job.id,
      organization_id: organizationId,
      source_type: job.sourceType,
      source_url: job.sourceUrl,
      source_key: job.sourceKey,
      clip_count: job.clipCount,
      style: job.style,
      // MVP: carry the delivery email so the worker can email finished clips.
      email: dto.email ?? null,
    };
    try {
      await this.queue.enqueue(payload);
    } catch (err) {
      // Roll back the debit; mark job failed.
      await this.billing.refundForJob(organizationId, credits, job.id);
      await this.store.updateJob(organizationId, job.id, {
        status: 'failed',
        error: `Failed to enqueue: ${(err as Error).message}`,
      });
      throw err;
    }

    this.logger.log(`Created job ${job.id} (org=${organizationId}, ${credits} credit(s), queue=${this.queue.backend}).`);
    return job;
  }

  async get(organizationId: string, jobId: string): Promise<JobRecord> {
    const job = await this.store.getJob(organizationId, jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  async list(organizationId: string): Promise<JobRecord[]> {
    return this.store.listJobs(organizationId);
  }
}
