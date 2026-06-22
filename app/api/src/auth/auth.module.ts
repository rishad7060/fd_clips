import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { AppAuthGuard } from './auth.guard';
import { AppAuthService } from './app-auth.service';
import { AuthController } from './auth.controller';

/**
 * Auth wiring. Exports the guard + app-token verifier. The guard is applied
 * per-controller (not globally) so the health and /auth/sync endpoints stay
 * outside the user-JWT requirement.
 */
@Global()
@Module({
  imports: [ConfigModule, PersistenceModule],
  controllers: [AuthController],
  providers: [AppAuthService, AppAuthGuard],
  exports: [AppAuthService, AppAuthGuard],
})
export class AuthModule {}
