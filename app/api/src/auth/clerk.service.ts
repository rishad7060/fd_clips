import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

interface VerifiedClaims {
  sub: string;
  // Clerk puts the active org id in `org_id` (and name in `org_name`/`org_slug`).
  org_id?: string;
  org_name?: string;
  org_slug?: string;
}

/**
 * Verifies Clerk-issued JWTs via the project's JWKS. In MOCK_AUTH mode this
 * service is never used (the guard injects a fake org instead). The verify
 * path uses jsonwebtoken + jwks-rsa, imported lazily so a missing dep does not
 * break the mock boot.
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private jwksClient: any;

  constructor(private readonly config: AppConfigService) {}

  private async getKey(header: { kid?: string }): Promise<string> {
    if (!this.jwksClient) {
      const jwksRsa = await import('jwks-rsa');
      const jwksUri =
        this.config.clerkJwksUrl ??
        // Clerk default JWKS endpoint pattern; override via CLERK_JWKS_URL.
        `https://${this.config.get<string>('CLERK_FRONTEND_API', 'clerk')}/.well-known/jwks.json`;
      this.jwksClient = jwksRsa.default({ jwksUri, cache: true, rateLimit: true });
    }
    const key = await this.jwksClient.getSigningKey(header.kid);
    return key.getPublicKey();
  }

  async verify(token: string): Promise<VerifiedClaims> {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.decode(token, { complete: true }) as { header: { kid?: string } } | null;
    if (!decoded) throw new UnauthorizedException('Malformed token');
    const publicKey = await this.getKey(decoded.header);
    try {
      return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as unknown as VerifiedClaims;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
