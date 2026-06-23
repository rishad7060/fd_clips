import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ClipsModule } from './clips/clips.module';
import { ConfigModule } from './config/config.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { PersistenceModule } from './persistence/persistence.module';
import { PlansModule } from './plans/plans.module';
import { PreviewModule } from './preview/preview.module';
import { ProgressModule } from './progress/progress.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    PlansModule,
    AuthModule,
    StorageModule,
    ProgressModule,
    QueueModule,
    BillingModule,
    JobsModule,
    ClipsModule,
    PreviewModule,
    FilesModule,
    UploadsModule,
    HealthModule,
    AdminModule,
  ],
})
export class AppModule {}
