import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ClipsModule } from './clips/clips.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { PersistenceModule } from './persistence/persistence.module';
import { ProgressModule } from './progress/progress.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    AuthModule,
    StorageModule,
    ProgressModule,
    QueueModule,
    BillingModule,
    JobsModule,
    ClipsModule,
    HealthModule,
  ],
})
export class AppModule {}
