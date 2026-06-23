"use client";

import { adminMock } from "@/lib/mock/adminStore";
import type { PlatformStatus } from "@/lib/adminTypes";

/**
 * Public read of the platform controls (maintenance / announcement). No auth is
 * required - the API exposes this at GET /platform/status. When the API URL is
 * unset (offline mock), we read the same in-memory admin store the dashboard
 * writes to, so toggling a control in /admin/system reflects here within the
 * session.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();

export async function getPlatformStatus(): Promise<PlatformStatus> {
  if (!API_URL) {
    const s = adminMock.getPlatformSettings();
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      announcement: s.announcement,
      signupsEnabled: s.signupsEnabled,
      updatedAt: s.updatedAt,
    };
  }
  const res = await fetch(`${API_URL}/platform/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`platform/status ${res.status}`);
  return (await res.json()) as PlatformStatus;
}
