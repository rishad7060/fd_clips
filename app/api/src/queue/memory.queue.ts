import { Logger } from '@nestjs/common';
import { MockWorker } from './mock-worker';
import { JobQueue, JobQueuePayload } from './queue.types';

/**
 * In-memory queue for local dev (no Redis). Enqueued jobs are handed to the
 * MockWorker which drives the full pipeline simulation. Processing is async
 * (next tick) so POST /jobs returns immediately, just like BullMQ.
 */
export class MemoryQueue implements JobQueue {
  readonly backend = 'in-memory' as const;
  private readonly logger = new Logger(MemoryQueue.name);

  constructor(private readonly worker: MockWorker) {}

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
