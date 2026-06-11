import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ProgressModule } from '../progress/progress.module';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { PROGRESS_BUS, ProgressBus } from '../progress/progress.types';
import { BullmqQueue } from './bullmq.queue';
import { MemoryQueue } from './memory.queue';
import { MockWorker } from './mock-worker';
import { JobQueue, JOB_QUEUE } from './queue.types';

/**
 * Provides the JobQueue. With Redis configured (and MOCK_MODE not forced) it is
 * BullMQ; otherwise an in-memory queue backed by the MockWorker, which also
 * refunds charged credits on simulated failure (roadmap 9d).
 */
@Global()
@Module({
  imports: [ConfigModule, PersistenceModule, ProgressModule],
  providers: [
    {
      provide: JOB_QUEUE,
      inject: [AppConfigService, DATA_STORE, PROGRESS_BUS],
      useFactory: async (
        config: AppConfigService,
        store: DataStore,
        bus: ProgressBus,
      ): Promise<JobQueue> => {
        const logger = new Logger('QueueModule');
        if (!config.flags.mockQueue && config.redisUrl) {
          const q = new BullmqQueue(config.redisUrl);
          try {
            await q.init();
            return q;
          } catch (err) {
            logger.error(
              `Redis unavailable (${(err as Error).message}); falling back to in-memory queue.`,
            );
          }
        }
        const worker = new MockWorker({
          store,
          bus,
          onFailure: async (orgId, jobId, credits) => {
            await store.addCredits(orgId, credits, 'refund', {
              jobId,
              note: 'Refund for failed job',
            });
          },
        });
        const mem = new MemoryQueue(worker);
        await mem.init();
        return mem;
      },
    },
  ],
  exports: [JOB_QUEUE],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(JOB_QUEUE) private readonly queue: JobQueue) {}
  async onApplicationShutdown(): Promise<void> {
    await this.queue.shutdown();
  }
}
