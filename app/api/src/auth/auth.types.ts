import { Request } from 'express';

/**
 * The authenticated principal attached to each request. organizationId is the
 * internal Organization.id (carried in the app token's `org_id` claim, or the
 * mock org in MOCK_AUTH mode), used to scope every downstream DB read/write.
 */
export interface AuthContext {
  userId: string;
  organizationId: string;
  orgName: string;
  /** Present for real (Google) users; absent in MOCK_AUTH mode. */
  email?: string;
  name?: string;
  /** Legacy/mock org id; null for self-hosted personal orgs. */
  clerkOrgId?: string | null;
}

export interface AuthedRequest extends Request {
  auth?: AuthContext;
}
