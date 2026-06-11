import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkService } from './clerk.service';

/**
 * Auth wiring. Exports the guard + Clerk verifier. The guard is applied
 * per-controller (not globally) so the health endpoint stays public.
 */
@Global()
@Module({
  imports: [ConfigModule, PersistenceModule],
  providers: [ClerkService, ClerkAuthGuard],
  exports: [ClerkService, ClerkAuthGuard],
})
export class AuthModule {}
