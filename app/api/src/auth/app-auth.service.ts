import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { UserRole } from '../persistence/store.types';

/** Claims carried by the app's own API access token (HS256). */
export interface AppClaims {
  /** Internal User.id. */
  sub: string;
  /** Internal Organization.id (the tenant boundary). */
  org_id: string;
  email?: string;
  name?: string;
  /** Access level minted into the token by the web session callback. */
  role?: UserRole;
}

/**
 * Verifies the app's own API access tokens. These are HS256 JWTs minted by the
 * web app's Auth.js session callback and signed with AUTH_JWT_SECRET (a shared
 * symmetric secret between web and API — both are services we own). In
 * MOCK_AUTH mode this service is never used (the guard injects a fake org).
 *
 * jsonwebtoken is imported lazily so a missing dep never breaks the mock boot.
 */
@Injectable()
export class AppAuthService {
  private readonly logger = new Logger(AppAuthService.name);

  constructor(private readonly config: AppConfigService) {}

  async verify(token: string): Promise<AppClaims> {
    const secret = this.config.authJwtSecret;
    if (!secret) {
      // Should not happen: real-auth mode requires the secret to be set.
      throw new UnauthorizedException('Auth not configured');
    }
    const jwt = await import('jsonwebtoken');
    try {
      return jwt.verify(token, secret, { algorithms: ['HS256'] }) as unknown as AppClaims;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
