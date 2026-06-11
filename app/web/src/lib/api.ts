"use client";

import type {
  Clip,
  ClipsResponse,
  ClipStyle,
  CreateJobInput,
  Job,
  JobProgressEvent,
  RenderClipInput,
  SourceType,
} from "./types";
import { mockStore } from "./mock/store";

/**
 * API client with a mock/real toggle.
 *
 * When NEXT_PUBLIC_API_URL is set, requests go to the real NestJS API
 * (CONTRACTS endpoints). When it is empty, the in-app mock store serves the
 * whole flow offline. The shapes are identical in both modes, so the real
 * implementation drops in without changing any caller.
 *
 * The real NestJS API exposes a camelCase DTO boundary (see jobs.mapper.ts /
 * clips.controller.ts), while the web app and CONTRACTS artifacts are
 * snake_case. We normalize camelCase -> snake_case here, at the client
 * boundary, so every downstream consumer (pages, ClipCard) keeps reading the
 * snake_case shapes unchanged.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
export const USING_MOCK_API = !API_URL;

// ---- Real-API DTO shapes (camelCase boundary) -----------------------------

/** Mirrors jobs.mapper.ts JobView. */
interface ApiJobView {
  jobId: string;
  organizationId: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceKey: string | null;
  clipCount: number;
  style: ClipStyle | null;
  status: Job["status"];
  progress: number;
  stage: Job["stage"];
  creditsCharged?: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors clips.controller.ts ClipView. */
interface ApiClipView {
  clipId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
}

// ---- Normalizers (camelCase API view -> snake_case wire types) -------------

function toJob(v: ApiJobView): Job {
  return {
    job_id: v.jobId,
    organization_id: v.organizationId,
    source_type: v.sourceType,
    source_url: v.sourceUrl,
    source_key: v.sourceKey,
    clip_count: v.clipCount,
    style: v.style,
    status: v.status,
    progress: v.progress,
    stage: v.stage,
    error: v.error,
    created_at: v.createdAt,
    updated_at: v.updatedAt,
    // Friendly title for the dashboard; the real API has no title field.
    title: v.sourceUrl ?? v.sourceKey ?? v.jobId,
  };
}

function toClip(v: ApiClipView): Clip {
  return {
    rank: v.rank,
    job_id: v.jobId,
    start: v.start,
    end: v.end,
    hook_line: v.hookLine,
    virality_score: v.viralityScore,
    reason: v.reason,
    suggested_title: v.suggestedTitle,
    // The signed/local-files URL doubles as the playable + downloadable src.
    final_url: v.downloadUrl ?? "",
    thumb_url: v.thumbnailUrl ?? "",
    // The real /clips endpoint does not return per-word caption lines; the
    // editor lazily falls back to an empty list (re-render is a later feature).
    caption_lines: [],
  };
}

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
    const v = await http<ApiJobView>("/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return toJob(v);
  },

  async getJob(jobId: string): Promise<Job> {
    if (USING_MOCK_API) {
      const job = mockStore.getJob(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);
      return delay(job, 120);
    }
    return toJob(await http<ApiJobView>(`/jobs/${jobId}`));
  },

  async listJobs(): Promise<Job[]> {
    if (USING_MOCK_API) return delay(mockStore.listJobs(), 120);
    const { jobs } = await http<{ jobs: ApiJobView[] }>("/jobs");
    return jobs.map(toJob);
  },

  async getClips(jobId: string): Promise<ClipsResponse> {
    if (USING_MOCK_API) {
      const clips = mockStore.getClips(jobId);
      if (!clips) throw new Error(`Clips for ${jobId} not found`);
      return delay(clips, 150);
    }
    // The real controller reads ?jobId= and returns { clips: ClipView[] }.
    const { clips } = await http<{ clips: ApiClipView[] }>(
      `/clips?jobId=${encodeURIComponent(jobId)}`,
    );
    const normalized = clips.map(toClip).sort((a, b) => a.rank - b.rank);
    return {
      job_id: jobId,
      // The /clips view does not carry the scoring model id; surface a label.
      model: "gemini",
      clips: normalized,
    };
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

    // Real mode: the API exposes a Socket.IO gateway (progress.gateway.ts) on
    // namespace "/ws". Clients emit `subscribe { job_id }` to join room
    // `job:{job_id}` and receive `progress` events. We speak the Socket.IO /
    // Engine.IO v4 protocol directly over a native WebSocket so no extra
    // client dependency is required. Falls back silently if WS is unavailable.
    return subscribeProgressWs(API_URL!, jobId, onEvent);
  },
};

// ---- Socket.IO (Engine.IO v4) over native WebSocket ------------------------
//
// Engine.IO packet types: 0=open 1=close 2=ping 3=pong 4=message.
// Socket.IO packet types (carried inside an Engine.IO "4" message):
//   0=CONNECT 1=DISCONNECT 2=EVENT 3=ACK ...
// A namespaced EVENT frame looks like:  42/ws,["progress",{...}]
const SIO_NAMESPACE = "/ws";

function subscribeProgressWs(
  apiUrl: string,
  jobId: string,
  onEvent: (e: JobProgressEvent) => void,
): () => void {
  // Engine.IO default path is /socket.io/; the namespace is selected via the
  // Socket.IO CONNECT packet, not the URL path.
  const base = apiUrl.replace(/\/$/, "").replace(/^http/, "ws");
  const wsUrl = `${base}/socket.io/?EIO=4&transport=websocket`;

  let ws: WebSocket | null = null;

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    return () => {};
  }

  const send = (data: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
  };

  ws.onmessage = (msg) => {
    const data = typeof msg.data === "string" ? msg.data : "";
    if (!data) return;
    const eio = data[0];

    if (eio === "0") {
      // Engine.IO OPEN -> initiate Socket.IO CONNECT to the /ws namespace.
      send(`40${SIO_NAMESPACE},`);
      return;
    }
    if (eio === "2") {
      // Engine.IO PING -> reply PONG to keep the connection alive.
      send("3");
      return;
    }
    if (eio !== "4") return; // not a Socket.IO message

    const sio = data.slice(1);
    if (sio.startsWith("0")) {
      // Socket.IO CONNECT ack (e.g. "0/ws,{...}") -> now subscribe to the job.
      send(`42${SIO_NAMESPACE},${JSON.stringify(["subscribe", { job_id: jobId }])}`);
      return;
    }
    if (sio.startsWith("2")) {
      // Socket.IO EVENT: "2/ws,[\"progress\", {...}]" (namespace is optional).
      let payload = sio.slice(1);
      if (payload.startsWith(SIO_NAMESPACE)) {
        const comma = payload.indexOf(",");
        payload = comma >= 0 ? payload.slice(comma + 1) : "";
      }
      // Strip a leading numeric ack id if present.
      payload = payload.replace(/^\d+/, "");
      try {
        const frame = JSON.parse(payload) as [string, JobProgressEvent];
        if (Array.isArray(frame) && frame[0] === "progress" && frame[1]) {
          onEvent(frame[1]);
        }
      } catch {
        /* ignore malformed frames */
      }
    }
  };

  ws.onerror = () => {
    /* ignore; caller may retry/fallback */
  };

  return () => {
    try {
      // Best-effort graceful Socket.IO + Engine.IO close.
      send(`41${SIO_NAMESPACE},`);
      ws?.close();
    } catch {
      /* ignore */
    }
  };
}
