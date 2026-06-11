import { Request } from 'express';

/**
 * The authenticated principal attached to each request. organizationId is the
 * internal Organization.id (resolved from the Clerk org id), used to scope
 * every downstream DB read/write.
 */
export interface AuthContext {
  userId: string;
  clerkOrgId: string;
  organizationId: string;
  orgName: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthContext;
}
