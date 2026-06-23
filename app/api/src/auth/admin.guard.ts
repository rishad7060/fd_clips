import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { AdminRequest } from './auth.types';
import { AppAuthService } from './app-auth.service';

/**
 * Gate for the cross-tenant admin API. Unlike AppAuthGuard, this does NOT
 * resolve or require an organization - admin endpoints read across all tenants.
 *
 * - MOCK_AUTH on (local dev, no AUTH_JWT_SECRET): open, a fake admin is injected.
 *   This mirrors AppAuthGuard's mock-org behavior so the whole stack - including
 *   the admin dashboard - is clickable locally with no keys (CLAUDE.md).
 * - MOCK_AUTH off (real mode): requires a valid HS256 Bearer token (minted by
 *   the web Auth.js session callback) whose `role` claim is `admin`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly auth: AppAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();

    if (this.config.flags.mockAuth) {
      req.admin = { userId: 'admin_mock_local', email: 'admin@local', role: 'admin' };
      return true;
    }

    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const claims = await this.auth.verify(token);
    if (claims.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    req.admin = { userId: claims.sub, email: claims.email, role: 'admin' };
    return true;
  }
}
