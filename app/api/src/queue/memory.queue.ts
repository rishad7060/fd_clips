import { Logger } from '@nestjs/common';
import { JobQueue, JobQueuePayload, JobWorker } from './queue.types';

/**
 * In-memory queue for local dev (no Redis). Enqueued jobs are handed to a
 * JobWorker — the MockWorker (full simulation) or the RealPipelineWorker
 * (spawns the Python pipeline). Processing is async (next tick) so POST /jobs
 * returns immediately, just like BullMQ.
 */
export class MemoryQueue implements JobQueue {
  readonly backend = 'in-memory' as const;
  private readonly logger = new Logger(MemoryQueue.name);

  constructor(private readonly worker: JobWorker) {}

  async init(): Promise<void> {
    this.logger.log('In-memory job queue ready (no Redis); jobs run via the mock worker.');
  }

  async shutdown(): Promise<void> {
    // Nothing to tear down for the in-process queue.
  }

  async enqueue(payload: JobQueuePayload): Promise<void> {
    this.logger.log(`Enqueued job ${payload.job_id} (in-memory).`);
    // Fire-and-forget; do not block the HTTP response on processing.
    setImmediate(() => {
      void this.worker.process(payload).catch((err) => {
        this.logger.error(`Mock worker error for ${payload.job_id}: ${(err as Error).message}`);
      });
    });
  }
}
