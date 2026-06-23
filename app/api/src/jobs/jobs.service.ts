import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
    // Platform control: operators can pause all new clip jobs (e.g. when the
    // worker fleet is down for maintenance) without a redeploy.
    const platform = await this.store.getPlatformSettings();
    if (!platform.newJobsEnabled) {
      throw new ServiceUnavailableException(
        'New clip jobs are temporarily paused by the administrator. Please try again later.',
      );
    }

    const credits = this.billing.creditsForDuration(dto.durationSec ?? 0);

    // Opus-style per-job config. Persist the camelCase DTO fields (only those
    // actually set) on the job record; null when none were supplied so existing
    // jobs/behavior are unchanged.
    const jobConfig = buildJobConfig(dto);

    // 1) Persist the job first (status=queued) so the ledger can reference it.
    const job = await this.store.createJob({
      organizationId,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl ?? null,
      sourceKey: dto.sourceKey ?? null,
      clipCount: dto.clipCount,
      style: dto.style ?? null,
      config: jobConfig,
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

    // 3) Enqueue for the worker (snake_case payload - CONTRACTS.md §1).
    const payload: JobQueuePayload = {
      job_id: job.id,
      organization_id: organizationId,
      source_type: job.sourceType,
      source_url: job.sourceUrl,
      source_key: job.sourceKey,
      clip_count: job.clipCount,
      style: job.style,
      // Opus-style config in run.py's SNAKE_CASE --config-json shape (null when
      // none was set → run.py applies all defaults = current behavior).
      config: toPipelineConfig(jobConfig),
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

  /** How many clips a job actually produced (Clip rows), not how many requested. */
  async clipsProduced(organizationId: string, jobId: string): Promise<number> {
    const clips = await this.store.listClips(organizationId, jobId);
    return clips.length;
  }

  /** Jobs paired with their actual produced-clip counts (for the dashboard). */
  async listWithClipCounts(
    organizationId: string,
  ): Promise<Array<{ job: JobRecord; clipsProduced: number }>> {
    const jobs = await this.store.listJobs(organizationId);
    // One clips query scoped to the org, bucketed by jobId - avoids N round-trips.
    const allClips = await this.store.listClips(organizationId);
    const counts = new Map<string, number>();
    for (const c of allClips) {
      counts.set(c.jobId, (counts.get(c.jobId) ?? 0) + 1);
    }
    return jobs.map((job) => ({ job, clipsProduced: counts.get(job.id) ?? 0 }));
  }
}

/**
 * Collect the Opus-style per-job config fields actually present on the DTO into
 * a camelCase object stored on the job record. Returns null when none were set
 * so jobs without a config are byte-for-byte unchanged (current behavior).
 */
function buildJobConfig(dto: CreateJobDto): Record<string, unknown> | null {
  const config: Record<string, unknown> = {};
  if (dto.aspectRatio !== undefined) config.aspectRatio = dto.aspectRatio;
  if (dto.clipLength !== undefined) config.clipLength = dto.clipLength;
  if (dto.genre !== undefined) config.genre = dto.genre;
  if (dto.includeMoments !== undefined) config.includeMoments = dto.includeMoments;
  if (dto.processRange !== undefined) {
    config.processRange = { start: dto.processRange.start, end: dto.processRange.end };
  }
  return Object.keys(config).length > 0 ? config : null;
}

/**
 * Map the stored camelCase job config to the SNAKE_CASE shape run.py's
 * --config-json expects ({ aspect_ratio, clip_length, genre, include_moments,
 * process_range:{start,end} }). Returns null when there's no config so the
 * worker omits --config-json entirely and run.py applies all defaults.
 */
function toPipelineConfig(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;
  const out: Record<string, unknown> = {};
  if (config.aspectRatio !== undefined) out.aspect_ratio = config.aspectRatio;
  if (config.clipLength !== undefined) out.clip_length = config.clipLength;
  if (config.genre !== undefined) out.genre = config.genre;
  if (config.includeMoments !== undefined) out.include_moments = config.includeMoments;
  if (config.processRange !== undefined) out.process_range = config.processRange;
  return Object.keys(out).length > 0 ? out : null;
}
