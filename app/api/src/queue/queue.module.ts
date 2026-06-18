import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { BillingService } from '../billing/billing.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { ProgressModule } from '../progress/progress.module';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { PROGRESS_BUS, ProgressBus } from '../progress/progress.types';
import { BullmqQueue } from './bullmq.queue';
import { MemoryQueue } from './memory.queue';
import { MockWorker } from './mock-worker';
import { RealPipelineWorker } from './real-pipeline.worker';
import { JobQueue, JobWorker, JOB_QUEUE } from './queue.types';

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
      inject: [AppConfigService, DATA_STORE, PROGRESS_BUS, BillingService],
      useFactory: async (
        config: AppConfigService,
        store: DataStore,
        bus: ProgressBus,
        billing: BillingService,
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
        const onFailure = async (orgId: string, jobId: string, credits: number): Promise<void> => {
          await store.addCredits(orgId, credits, 'refund', {
            jobId,
            note: 'Refund for failed job',
          });
        };
        // Opt-in real pipeline (USE_REAL_PIPELINE=true) spawns pipeline/run.py;
        // otherwise the default MockWorker simulates the pipeline. Both satisfy
        // the JobWorker contract the MemoryQueue drives.
        // Duration true-up: after ingest the real source duration reconciles
        // the up-front (client-estimated) charge. Returns whether the org could
        // afford the full video (false → fail the job; charge already refunded).
        const onIngestDuration = async (
          orgId: string,
          jobId: string,
          realDurationSec: number,
          chargedAtCreate: number,
        ): Promise<{ insufficient: boolean }> => {
          const r = await billing.reconcileJobDuration(
            orgId,
            jobId,
            realDurationSec,
            chargedAtCreate,
          );
          return { insufficient: r.insufficient };
        };
        const worker: JobWorker = config.flags.useRealPipeline
          ? new RealPipelineWorker({ store, bus, onFailure, onIngestDuration })
          : new MockWorker({ store, bus, onFailure });
        logger.log(
          `In-memory queue using ${config.flags.useRealPipeline ? 'RealPipelineWorker' : 'MockWorker'}.`,
        );
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
