import type { DefaultSession } from "next-auth";

/**
 * Augments Auth.js types with the app-specific fields we attach in the
 * jwt/session callbacks (see src/auth.ts).
 */
declare module "next-auth" {
  interface Session {
    userId?: string;
    organizationId?: string;
    orgName?: string;
    plan?: string;
    /** HS256 token the api client sends as a Bearer to the NestJS API. */
    apiToken?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    orgName?: string;
    plan?: string;
  }
}
