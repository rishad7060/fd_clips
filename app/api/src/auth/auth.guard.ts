import { CanActivate, ExecutionContext, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { AuthedRequest } from './auth.types';
import { AppAuthService } from './app-auth.service';
// Single source of truth for the free-tier grant (Opus parity: 60 min/mo).
// Defined on the free plan in billing/plans.ts; imported here so the guard and
// the plan catalog can never drift out of sync.
import { FREE_TIER_CREDITS } from '../billing/plans';

const MOCK_CLERK_ORG = 'org_mock_local';
const MOCK_USER = 'user_mock_local';
const MOCK_ORG_NAME = 'Local Dev Org';

/**
 * Guard that resolves the request's organization.
 *
 * - MOCK_AUTH on: no Authorization header required; a stable fake org is
 *   upserted and injected so every endpoint runs without auth credentials.
 * - MOCK_AUTH off: requires `Authorization: Bearer <app_jwt>` (an HS256 token
 *   minted by the web app's Auth.js layer), verifies it, and loads the internal
 *   Organization referenced by the token's `org_id` claim.
 *
 * Either way, req.auth.organizationId is the internal id used to scope data.
 */
@Injectable()
export class AppAuthGuard implements CanActivate {
  private readonly logger = new Logger(AppAuthGuard.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly auth: AppAuthService,
    @Inject(DATA_STORE) private readonly store: DataStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    if (this.config.flags.mockAuth) {
      const org = await this.store.upsertOrganizationByClerkId(
        MOCK_CLERK_ORG,
        MOCK_ORG_NAME,
        FREE_TIER_CREDITS,
      );
      req.auth = {
        userId: MOCK_USER,
        clerkOrgId: MOCK_CLERK_ORG,
        organizationId: org.id,
        orgName: org.name,
      };
      return true;
    }

    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const claims = await this.auth.verify(token);
    if (!claims.org_id) {
      throw new UnauthorizedException('Token has no organization (org_id)');
    }
    const org = await this.store.getOrganization(claims.org_id);
    if (!org) {
      throw new UnauthorizedException('Unknown organization');
    }
    req.auth = {
      userId: claims.sub,
      organizationId: org.id,
      orgName: org.name,
      email: claims.email,
      name: claims.name,
      clerkOrgId: org.clerkOrgId,
    };
    return true;
  }
}
