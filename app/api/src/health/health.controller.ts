import { Controller, Get, Inject } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { JOB_QUEUE, JobQueue } from '../queue/queue.types';

/**
 * Public health endpoint. Reports the resolved feature flags so it is obvious
 * at a glance whether the API booted in mock/local mode.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
  ) {}

  @Get()
  check() {
    const f = this.config.flags;
    return {
      status: 'ok',
      service: 'focaldive-api',
      ts: new Date().toISOString(),
      mockMode: f.mockMode,
      subsystems: {
        auth: f.mockAuth ? 'mock' : 'clerk',
        database: f.mockDb ? 'in-memory' : 'postgres',
        queue: this.queue.backend,
        storage: f.mockStorage ? 'mock' : 'r2',
        billing: f.mockBilling ? 'mock' : 'paypal',
      },
    };
  }
}
