import { Global, Module } from '@nestjs/common';
import { InProcessProgressBus } from './progress.bus';
import { ProgressGateway } from './progress.gateway';
import { PROGRESS_BUS } from './progress.types';
import { ConfigModule } from '../config/config.module';

/**
 * Progress fan-out: a bus (producer side) + a WebSocket gateway (consumer
 * side) that relays JobProgressEvents to subscribed web clients.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    { provide: PROGRESS_BUS, useClass: InProcessProgressBus },
    ProgressGateway,
  ],
  exports: [PROGRESS_BUS],
})
export class ProgressModule {}
