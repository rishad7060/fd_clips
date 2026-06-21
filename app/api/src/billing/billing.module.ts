import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PolarService } from './polar.service';

@Global()
@Module({
  imports: [ConfigModule, PersistenceModule, AuthModule],
  controllers: [BillingController],
  // BillingService stays (credits/debits/true-up + the now-dormant PayPal code);
  // PolarService is the active payment provider for checkout/cancel/webhook.
  providers: [BillingService, PolarService],
  exports: [BillingService, PolarService],
})
export class BillingModule {}
