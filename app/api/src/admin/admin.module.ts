import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Cross-tenant admin dashboard API. DATA_STORE, AppConfigService, JOB_QUEUE and
 * the AdminGuard (via AppAuthService) all come from @Global modules, so this
 * module only needs to declare its own controller + service.
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
