import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";

/**
 * Self-hosted authentication (Auth.js v5 + Google OAuth).
 *
 * Flow:
 *  1. Google sign-in → the `jwt` callback (first login) calls the NestJS API's
 *     internal `POST /auth/sync` to provision a User + personal Organization,
 *     and stashes the returned ids on the NextAuth JWT.
 *  2. The `session` callback mints a short-lived HS256 API access token (signed
 *     with AUTH_JWT_SECRET, shared with the API) carrying { sub, org_id, ... }.
 *     <AuthTokenBridge/> registers it so api.ts sends it as a Bearer token.
 *
 * The NextAuth session cookie is the real gate; the HS256 token is an internal
 * hand-off between two services we own.
 */

// Server-side base URL the web server uses to reach the API (defaults to the
// browser-facing URL when not separately set).
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:4000";

interface SyncResult {
  userId: string;
  organizationId: string;
  orgName: string;
  plan: string;
}

async function syncUser(profile: {
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<SyncResult> {
  const res = await fetch(`${API_INTERNAL_URL}/auth/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.AUTH_INTERNAL_SECRET ?? "",
    },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`auth/sync failed: ${res.status} ${body}`);
  }
  return (await res.json()) as SyncResult;
}

/** Mint the HS256 API access token consumed by the NestJS guard. */
async function mintApiToken(claims: {
  userId: string;
  organizationId: string;
  email?: string | null;
  name?: string | null;
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? "");
  return new SignJWT({
    org_id: claims.organizationId,
    email: claims.email ?? undefined,
    name: claims.name ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    // First login carries `profile`; provision the user/org and remember the ids
    // on the token for subsequent requests.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const result = await syncUser({
          googleId: (profile.sub as string) ?? token.sub ?? "",
          email: profile.email as string,
          name: (profile.name as string) ?? null,
          avatarUrl: (profile.picture as string) ?? null,
        });
        token.userId = result.userId;
        token.organizationId = result.organizationId;
        token.orgName = result.orgName;
        token.plan = result.plan;
      }
      return token;
    },
    // Expose user fields + a freshly minted API token to the client.
    async session({ session, token }) {
      if (token.userId && token.organizationId) {
        session.userId = token.userId as string;
        session.organizationId = token.organizationId as string;
        session.orgName = token.orgName as string | undefined;
        session.plan = token.plan as string | undefined;
        session.apiToken = await mintApiToken({
          userId: token.userId as string,
          organizationId: token.organizationId as string,
          email: session.user?.email,
          name: session.user?.name,
        });
      }
      return session;
    },
  },
});
