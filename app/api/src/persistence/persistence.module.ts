import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { MemoryStore } from './memory.store';
import { PrismaStore } from './prisma.store';
import { DataStore, DATA_STORE } from './store.types';

/**
 * Provides a single DataStore. In MOCK/local mode it is the in-memory store;
 * with DATABASE_URL present (and MOCK_MODE not forced) it is Prisma/Postgres.
 * If Postgres connection fails at boot, it degrades to the memory store so the
 * app still comes up locally.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATA_STORE,
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService): Promise<DataStore> => {
        const logger = new Logger('PersistenceModule');
        if (!config.flags.mockDb && config.databaseUrl) {
          const store = new PrismaStore(config.databaseUrl);
          try {
            await store.init();
            return store;
          } catch (err) {
            logger.error(
              `Postgres unavailable (${(err as Error).message}); falling back to in-memory store.`,
            );
          }
        }
        const mem = new MemoryStore();
        await mem.init();
        return mem;
      },
    },
  ],
  exports: [DATA_STORE],
})
export class PersistenceModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown(): Promise<void> {
    // DataStore shutdown is handled by Nest disposing the provider scope.
  }
}
