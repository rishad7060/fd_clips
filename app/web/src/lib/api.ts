"use client";

import type {
  Clip,
  ClipsResponse,
  CreateJobInput,
  Job,
  JobProgressEvent,
  RenderClipInput,
} from "./types";
import { mockStore } from "./mock/store";

/**
 * API client with a mock/real toggle.
 *
 * When NEXT_PUBLIC_API_URL is set, requests go to the real NestJS API
 * (CONTRACTS endpoints). When it is empty, the in-app mock store serves the
 * whole flow offline. The shapes are identical in both modes, so the real
 * implementation drops in without changing any caller.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
export const USING_MOCK_API = !API_URL;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

/** Small delay so mock interactions feel like network calls (and show spinners). */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const api = {
  usingMock: USING_MOCK_API,

  async createJob(input: CreateJobInput): Promise<Job> {
    if (USING_MOCK_API) return delay(mockStore.createJob(input));
    return http<Job>("/jobs", { method: "POST", body: JSON.stringify(input) });
  },

  async getJob(jobId: string): Promise<Job> {
    if (USING_MOCK_API) {
      const job = mockStore.getJob(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);
      return delay(job, 120);
    }
    return http<Job>(`/jobs/${jobId}`);
  },

  async listJobs(): Promise<Job[]> {
    if (USING_MOCK_API) return delay(mockStore.listJobs(), 120);
    return http<Job[]>("/jobs");
  },

  async getClips(jobId: string): Promise<ClipsResponse> {
    if (USING_MOCK_API) {
      const clips = mockStore.getClips(jobId);
      if (!clips) throw new Error(`Clips for ${jobId} not found`);
      return delay(clips, 150);
    }
    return http<ClipsResponse>(`/clips?job_id=${encodeURIComponent(jobId)}`);
  },

  async renderClip(input: RenderClipInput): Promise<Clip> {
    if (USING_MOCK_API) {
      const clip = mockStore.renderClip(input);
      if (!clip) throw new Error(`Clip not found for re-render`);
      return delay(clip, 600);
    }
    return http<Clip>(`/clips/render`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Subscribe to live progress. In mock mode we poll the in-memory store on a
   * timer; in real mode this opens a WebSocket to the API gateway
   * (CONTRACTS §4, room job:{job_id}). Returns an unsubscribe function.
   */
  subscribeProgress(
    jobId: string,
    onEvent: (e: JobProgressEvent) => void,
  ): () => void {
    if (USING_MOCK_API) {
      const interval = setInterval(() => {
        const evt = mockStore.progressEvent(jobId);
        if (evt) onEvent(evt);
        if (evt && (evt.status === "completed" || evt.status === "failed")) {
          clearInterval(interval);
        }
      }, 500);
      // Fire one immediately.
      const first = mockStore.progressEvent(jobId);
      if (first) onEvent(first);
      return () => clearInterval(interval);
    }

    // Real mode: WebSocket. Falls back silently if WS is unavailable.
    const wsUrl = API_URL!.replace(/^http/, "ws") + `/jobs/${jobId}/progress`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (msg) => {
        try {
          onEvent(JSON.parse(msg.data) as JobProgressEvent);
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* ignore connection errors in non-WS environments */
    }
    return () => ws?.close();
  },
};
