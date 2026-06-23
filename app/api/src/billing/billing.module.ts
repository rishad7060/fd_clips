import { Global, Module } from '@nestjs/common';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PolarService } from './polar.service';

@Global()
@Module({
  // AffiliatesModule is imported so PolarService can credit referral commissions
  // on a paid grant. AffiliatesService depends only on Config/Persistence (not
  // BillingService), so there is no circular dependency.
  imports: [ConfigModule, PersistenceModule, AuthModule, AffiliatesModule],
  controllers: [BillingController],
  // BillingService owns credits/debits/true-up; PolarService is the payment
  // provider for checkout/cancel/webhook.
  providers: [BillingService, PolarService],
  exports: [BillingService, PolarService],
})
export class BillingModule {}
