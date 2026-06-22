"use client";

/**
 * Admin API client. Mirrors the creator api.ts pattern: when NEXT_PUBLIC_API_URL
 * is set, calls the NestJS /admin/* endpoints with the session Bearer token
 * (reusing getAuthHeader from api.ts); when empty, serves offline fixtures from
 * mock/adminStore so the dashboard is fully clickable without the API.
 */
import { getSession } from "next-auth/react";
import { getAuthHeader } from "@/lib/api";
import { adminMock } from "@/lib/mock/adminStore";
import type {
  AdminClip,
  AdminJob,
  AdminLedgerEntry,
  AdminOrg,
  AdminOverview,
  AdminPlan,
  AdminSystemInfo,
  AdminUser,
  ListParams,
  Paged,
  PlanTier,
  UserRole,
} from "@/lib/adminTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
export const USING_MOCK_ADMIN = !API_URL;

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

function qs(params: Record<string, unknown> | ListParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Bearer header for admin requests. Reads the freshly minted apiToken straight
 * from the NextAuth session at call time (getSession), which avoids the race
 * where a page fetches before AuthTokenBridge has registered the token getter.
 * Falls back to the shared api.ts getter if the session lookup yields nothing.
 */
async function adminAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await getSession();
    const token = session?.apiToken;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    /* fall through */
  }
  return getAuthHeader();
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await adminAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Admin API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const adminApi = {
  getOverview(rangeDays = 30): Promise<AdminOverview> {
    if (USING_MOCK_ADMIN) return delay(adminMock.overview(rangeDays));
    return http(`/admin/overview${qs({ rangeDays })}`);
  },
  listOrganizations(p: ListParams = {}): Promise<Paged<AdminOrg>> {
    if (USING_MOCK_ADMIN) return delay(adminMock.listOrganizations(p));
    return http(`/admin/organizations${qs(p)}`);
  },
  listUsers(p: ListParams = {}): Promise<Paged<AdminUser>> {
    if (USING_MOCK_ADMIN) return delay(adminMock.listUsers(p));
    return http(`/admin/users${qs(p)}`);
  },
  listJobs(p: ListParams = {}): Promise<Paged<AdminJob>> {
    if (USING_MOCK_ADMIN) return delay(adminMock.listJobs(p));
    return http(`/admin/jobs${qs(p)}`);
  },
  listClips(p: ListParams = {}): Promise<Paged<AdminClip>> {
    if (USING_MOCK_ADMIN) return delay(adminMock.listClips(p));
    return http(`/admin/clips${qs(p)}`);
  },
  listLedger(p: ListParams = {}): Promise<Paged<AdminLedgerEntry>> {
    if (USING_MOCK_ADMIN) return delay(adminMock.listLedger(p));
    return http(`/admin/ledger${qs(p)}`);
  },
  getPlans(): Promise<AdminPlan[]> {
    if (USING_MOCK_ADMIN) return delay(adminMock.plans());
    return http(`/admin/plans`);
  },
  getSystem(): Promise<AdminSystemInfo> {
    if (USING_MOCK_ADMIN) return delay(adminMock.system());
    return http(`/admin/system`);
  },
  setUserRole(id: string, role: UserRole): Promise<AdminUser> {
    if (USING_MOCK_ADMIN) return delay(adminMock.setUserRole(id, role));
    return http(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
  },
  adjustCredits(orgId: string, amount: number, note?: string): Promise<AdminOrg> {
    if (USING_MOCK_ADMIN) return delay(adminMock.adjustCredits(orgId, amount, note));
    return http(`/admin/organizations/${orgId}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, note }),
    });
  },
  setPlan(orgId: string, plan: PlanTier): Promise<AdminOrg> {
    if (USING_MOCK_ADMIN) return delay(adminMock.setPlan(orgId, plan));
    return http(`/admin/organizations/${orgId}/plan`, { method: "PATCH", body: JSON.stringify({ plan }) });
  },
  cancelJob(id: string): Promise<AdminJob> {
    if (USING_MOCK_ADMIN) return delay(adminMock.cancelJob(id));
    return http(`/admin/jobs/${id}/cancel`, { method: "POST" });
  },
  deleteUser(id: string): Promise<{ deleted: boolean }> {
    if (USING_MOCK_ADMIN) return delay(adminMock.deleteUser(id));
    return http(`/admin/users/${id}`, { method: "DELETE" });
  },
  deleteOrganization(id: string): Promise<{ deleted: boolean }> {
    if (USING_MOCK_ADMIN) return delay(adminMock.deleteOrganization(id));
    return http(`/admin/organizations/${id}`, { method: "DELETE" });
  },
  deleteJob(id: string): Promise<{ deleted: boolean }> {
    if (USING_MOCK_ADMIN) return delay(adminMock.deleteJob(id));
    return http(`/admin/jobs/${id}`, { method: "DELETE" });
  },
  deleteClip(id: string): Promise<{ deleted: boolean }> {
    if (USING_MOCK_ADMIN) return delay(adminMock.deleteClip(id));
    return http(`/admin/clips/${id}`, { method: "DELETE" });
  },
};
