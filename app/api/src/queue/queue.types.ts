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
  /**
   * Opus-style per-job clip-generation config in the SNAKE_CASE shape run.py
   * --config-json expects: { aspect_ratio, clip_length, genre, include_moments,
   * process_range:{start,end} }. Null/omitted = all defaults (current behavior).
   */
  config?: Record<string, unknown> | null;
  /** MVP: delivery email so the worker can email finished clips (Resend). */
  email?: string | null;
}

/**
 * A worker the in-memory queue can drive. Both MockWorker (local simulation)
 * and RealPipelineWorker (spawns the Python pipeline) implement this so the
 * MemoryQueue stays agnostic to which one it runs. process() takes one payload
 * and runs the job to completion (fire-and-forget from the queue's POV).
 */
export interface JobWorker {
  process(payload: JobQueuePayload): Promise<void>;
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
