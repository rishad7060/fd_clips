import { Logger } from '@nestjs/common';
import { JobQueue, JobQueuePayload, QUEUE_NAME } from './queue.types';

/**
 * BullMQ/Redis queue (real mode). The GPU worker (worker/) consumes this queue;
 * the API is only a producer here. BullMQ is imported lazily so the dependency
 * is not required to boot in mock mode.
 */
export class BullmqQueue implements JobQueue {
  readonly backend = 'bullmq' as const;
  private readonly logger = new Logger(BullmqQueue.name);
  private queue: any;

  constructor(private readonly redisUrl: string) {}

  async init(): Promise<void> {
    const { Queue } = await import('bullmq');
    this.queue = new Queue(QUEUE_NAME, { connection: { url: this.redisUrl } as any });
    this.logger.log(`BullMQ queue "${QUEUE_NAME}" connected to Redis.`);
  }

  async shutdown(): Promise<void> {
    if (this.queue) await this.queue.close();
  }

  async enqueue(payload: JobQueuePayload): Promise<void> {
    // Job name "process" with the snake_case payload from CONTRACTS.md §1.
    await this.queue.add('process', payload, {
      jobId: payload.job_id,
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Enqueued job ${payload.job_id} to BullMQ.`);
  }
}
