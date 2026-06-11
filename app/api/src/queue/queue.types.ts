/**
 * BullMQ job payload (API → worker). Matches CONTRACTS.md §1 "Queue payload":
 * snake_case over the wire, minimal fields, everything else looked up by job_id.
 */
export interface JobQueuePayload {
  job_id: string;
  organization_id: string;
  source_type: 'url' | 'upload';
  source_url: string | null;
  source_key: string | null;
  clip_count: number;
  style: Record<string, unknown> | null;
}

/**
 * Queue abstraction. The real impl is BullMQ on Redis; the mock impl is an
 * in-process queue that drives a fake worker so local dev produces progress
 * events and clips end-to-end. Callers only ever see this interface.
 */
export interface JobQueue {
  init(): Promise<void>;
  shutdown(): Promise<void>;
  enqueue(payload: JobQueuePayload): Promise<void>;
  /** Human-readable backend name for logging/health. */
  readonly backend: 'bullmq' | 'in-memory';
}

export const JOB_QUEUE = Symbol('JOB_QUEUE');
export const QUEUE_NAME = 'clip-jobs';
