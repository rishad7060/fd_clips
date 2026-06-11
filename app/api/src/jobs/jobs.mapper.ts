import { JobRecord } from '../persistence/store.types';

/** API view of a Job (camelCase boundary; CONTRACTS.md §1). */
export interface JobView {
  jobId: string;
  organizationId: string;
  sourceType: 'url' | 'upload';
  sourceUrl: string | null;
  sourceKey: string | null;
  clipCount: number;
  style: Record<string, unknown> | null;
  status: JobRecord['status'];
  progress: number;
  stage: JobRecord['stage'];
  creditsCharged: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toJobView(job: JobRecord): JobView {
  return {
    jobId: job.id,
    organizationId: job.organizationId,
    sourceType: job.sourceType,
    sourceUrl: job.sourceUrl,
    sourceKey: job.sourceKey,
    clipCount: job.clipCount,
    style: job.style,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    creditsCharged: job.creditsCharged,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
