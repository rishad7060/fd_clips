import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthContext, AuthedRequest } from './auth.types';

/**
 * Injects the resolved AuthContext for the request. Use as a controller param:
 *   @CurrentOrg() auth: AuthContext
 */
export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.auth) {
    throw new UnauthorizedException('No authenticated organization on request');
  }
  return req.auth;
});
