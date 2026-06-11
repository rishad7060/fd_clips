import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Global()
@Module({
  imports: [ConfigModule, PersistenceModule, AuthModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
