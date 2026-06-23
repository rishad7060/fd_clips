import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';

/**
 * Affiliate / referral program. AuthModule (guards) and PlansModule are global,
 * so only Config + Persistence are imported. Exports AffiliatesService so the
 * billing layer (PolarService) can credit commissions on conversion.
 */
@Module({
  imports: [ConfigModule, PersistenceModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
