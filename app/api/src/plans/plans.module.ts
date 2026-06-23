import { Global, Module } from '@nestjs/common';
import { PlansService } from './plans.service';

/**
 * Global plan catalog. Provides PlansService (DataStore-backed, seeded from
 * defaults) so billing, Polar, auth provisioning and the admin module all read
 * one live source of truth. Only depends on the global PersistenceModule.
 */
@Global()
@Module({
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
