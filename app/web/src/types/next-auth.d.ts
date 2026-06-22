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
    /** Access level; "admin" unlocks the /admin dashboard. */
    role?: "user" | "admin";
    /** HS256 token the api client sends as a Bearer to the NestJS API. */
    apiToken?: string;
    user?: DefaultSession["user"];
  }

  /** Augment the object returned by the Credentials `authorize` callback. */
  interface User {
    userId?: string;
    organizationId?: string;
    orgName?: string;
    plan?: string;
    role?: "user" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    orgName?: string;
    plan?: string;
    role?: "user" | "admin";
  }
}
