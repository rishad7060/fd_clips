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
  /**
   * Number of clips the pipeline ACTUALLY produced (rows in the Clip store),
   * as opposed to `clipCount` which is how many were *requested*. A completed
   * job can have 0 produced clips when the scorer found no standout moment, so
   * the UI must use this — not clipCount — to label/route the card.
   */
  clipsProduced: number;
}

export function toJobView(job: JobRecord, clipsProduced = 0): JobView {
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
    clipsProduced,
  };
}
