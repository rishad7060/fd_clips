import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { QueueModule } from '../queue/queue.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule, QueueModule],
  controllers: [HealthController],
})
export class HealthModule {}
