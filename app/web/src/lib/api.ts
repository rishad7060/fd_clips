"use client";

import type {
  Clip,
  ClipsResponse,
  ClipStyle,
  ClipTranscript,
  CreateJobInput,
  CreditBalance,
  Job,
  JobProgressEvent,
  RenderClipInput,
  SourceType,
  VideoPreview,
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

/**
 * Monthly credit grant per plan tier - mirrors PLANS in app/api/src/billing/
 * plans.ts. The /billing/balance endpoint returns only { plan, creditBalance },
 * so the client derives monthly_credits here to render a quota/balance bar.
 * Falls back to the free grant (60) for any unknown plan id.
 */
const MONTHLY_CREDITS: Record<string, number> = {
  free: 60,
  starter: 150,
  pro: 300,
};
const DEFAULT_MONTHLY_CREDITS = 60;

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
  clipsProduced?: number;
}

/** Mirrors clips.controller.ts ClipView. */
interface ApiClipView {
  clipId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  hookTitle?: string | null;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
}

/** Mirrors preview.controller.ts PreviewView (camelCase boundary). */
interface ApiPreviewView {
  title: string;
  thumbnailUrl: string;
  durationSec: number;
  width: number;
  height: number;
  qualityLabel: string;
  note?: string;
}

/** Mirrors billing.controller.ts balance(): { plan, creditBalance }. */
interface ApiBalanceView {
  plan: string;
  creditBalance: number;
}

/** Mirrors billing.controller.ts subscribe(): SubscriptionStart. */
interface ApiSubscriptionStartView {
  url: string;
  subscriptionId: string;
  mock: boolean;
  tier: string;
}

/** Result of starting a Polar recurring subscription (snake_case wire shape). */
export interface SubscriptionStart {
  /** Polar hosted-checkout URL to redirect to (mock: a local stub - don't redirect). */
  url: string;
  subscription_id: string;
  /** True when no real Polar redirect happened (offline/keyless: already granted). */
  mock: boolean;
  tier: string;
}

/** Mirrors clips.controller.ts WordView (clip-relative seconds). */
interface ApiWordView {
  word: string;
  start: number;
  end: number;
}

/** Mirrors clips.controller.ts ClipTranscriptView. */
interface ApiClipTranscriptView {
  clipId: string;
  jobId: string;
  rank: number;
  clipStart: number;
  clipEnd: number;
  words: ApiWordView[];
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
    clips_produced: v.clipsProduced ?? 0,
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
    hook_title: v.hookTitle ?? null,
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

/**
 * API access-token getter, installed at runtime by <AuthTokenBridge/> (only
 * mounted when Auth.js is enabled). In mock/dev mode it stays null, so http()
 * sends no Authorization header and nothing changes. We keep it as a
 * module-level seam so the api object - imported by client components - can
 * attach the Bearer token without each caller knowing about the auth provider.
 */
let getToken: (() => Promise<string | null>) | null = null;

/** Register the session token getter (called from the AuthTokenBridge). */
export function setTokenGetter(fn: (() => Promise<string | null>) | null): void {
  getToken = fn;
}

/**
 * Best-effort Bearer header; never throws, returns {} when no token. Exported
 * (as getAuthHeader) so the separate admin client reuses the same registered
 * session token without re-wiring the AuthTokenBridge.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  return authHeader();
}
async function authHeader(): Promise<Record<string, string>> {
  if (!getToken) return {};
  try {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(init?.headers ?? {}),
    },
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
    // The API boundary is camelCase (CreateJobDto) with whitelist validation -
    // map the snake_case wire input to it, and only send fields it accepts.
    const body: Record<string, unknown> = {
      sourceType: input.source_type,
      clipCount: input.clip_count,
    };
    if (input.source_url) body.sourceUrl = input.source_url;
    if (input.source_key) body.sourceKey = input.source_key;
    // MVP: forward the delivery email so the worker can email finished clips
    // (Resend). Omitted when absent so DTO whitelist validation stays happy.
    if (input.email) body.email = input.email;
    // The DTO requires style to be an object; the picker sends a string id, so
    // wrap it (or omit). Omit empty styles entirely to satisfy whitelisting.
    if (input.style) {
      body.style =
        typeof input.style === "object" ? input.style : { template: input.style };
    }
    // Opus-style config: map the snake_case web fields to the camelCase DTO and
    // send only the ones that are set (forbidNonWhitelisted strips unknowns).
    if (input.aspect_ratio) body.aspectRatio = input.aspect_ratio;
    if (input.clip_length) body.clipLength = input.clip_length;
    if (input.genre) body.genre = input.genre;
    if (input.include_moments) body.includeMoments = input.include_moments;
    if (input.process_range) body.processRange = input.process_range;
    const v = await http<ApiJobView>("/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return toJob(v);
  },

  /**
   * Lightweight preview metadata for a pasted URL (POST /preview) - title,
   * thumbnail, resolution badge - fetched WITHOUT downloading the video. The
   * real API view is camelCase; we map it to the snake_case VideoPreview. Mock
   * mode serves a deterministic stub offline. The endpoint never 500s, so a
   * thrown error here is only a network/transport failure; callers should treat
   * a failure as "no preview yet" and not block the flow.
   */
  async getPreview(url: string): Promise<VideoPreview> {
    if (USING_MOCK_API) return delay(mockStore.getPreview(url), 300);
    const v = await http<ApiPreviewView>("/preview", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    return {
      title: v.title,
      thumbnail_url: v.thumbnailUrl,
      duration_sec: v.durationSec,
      width: v.width,
      height: v.height,
      quality_label: v.qualityLabel,
      note: v.note,
    };
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

  /**
   * Per-clip transcript words (clip-relative seconds) for the karaoke subtitle
   * layer. Mock mode synthesizes/derives words offline; real mode hits
   * GET /clips/transcript and maps camelCase -> snake_case. Callers should wrap
   * in try/catch - a failure should degrade to an empty word list so the hook
   * layer still works.
   */
  async getClipTranscript(jobId: string, rank: number): Promise<ClipTranscript> {
    if (USING_MOCK_API) {
      const t = mockStore.getClipTranscript(jobId, rank);
      if (!t) throw new Error(`Transcript for ${jobId}#${rank} not found`);
      return delay(t, 150);
    }
    const v = await http<ApiClipTranscriptView>(
      `/clips/transcript?jobId=${encodeURIComponent(jobId)}&rank=${rank}`,
    );
    return {
      job_id: v.jobId,
      rank: v.rank,
      clip_start: v.clipStart,
      clip_end: v.clipEnd,
      words: v.words.map((w) => ({ word: w.word, start: w.start, end: w.end })),
    };
  },

  async renderClip(input: RenderClipInput): Promise<Clip> {
    if (USING_MOCK_API) {
      const clip = mockStore.renderClip(input);
      if (!clip) throw new Error(`Clip not found for re-render`);
      return delay(clip, 600);
    }
    // The API boundary is camelCase (RenderClipDto) with whitelist validation:
    // map snake_case -> camelCase and send ONLY the fields the DTO accepts
    // (jobId, rank, start, end, style, captions). caption_lines is NOT a DTO
    // field; the EDITED per-word `captions` carry the text into the render.
    const body: Record<string, unknown> = {
      jobId: input.job_id,
      rank: input.rank,
    };
    if (typeof input.start === "number") body.start = input.start;
    if (typeof input.end === "number") body.end = input.end;
    if (input.style) body.style = input.style;
    if (input.captions && input.captions.length > 0) {
      body.captions = input.captions;
    }
    const v = await http<ApiClipView>(`/clips/render`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return toClip(v);
  },

  /**
   * Current org plan + credit balance (GET /billing/balance). The real API
   * returns { plan, creditBalance } (camelCase); we normalize to snake_case and
   * derive monthly_credits from the web-side plan→credits map. Mock mode serves
   * a deterministic free-plan balance offline.
   */
  async getBalance(): Promise<CreditBalance> {
    if (USING_MOCK_API) return delay(mockStore.getBalance(), 120);
    const v = await http<ApiBalanceView>("/billing/balance");
    return {
      plan: v.plan,
      credit_balance: v.creditBalance,
      monthly_credits: MONTHLY_CREDITS[v.plan] ?? DEFAULT_MONTHLY_CREDITS,
    };
  },

  /**
   * Start a Polar recurring SUBSCRIPTION for a paid tier (POST /billing/subscribe).
   * Returns the hosted-checkout URL the buyer is redirected to (+ subscription id).
   * In mock mode the URL is a local stub, mock=true, and the plan is already granted
   * locally - the caller refreshes the balance instead of redirecting.
   */
  async createSubscription(tier: "starter" | "pro"): Promise<SubscriptionStart> {
    if (USING_MOCK_API) {
      const r = mockStore.createSubscription(tier);
      return delay({
        url: r.url,
        subscription_id: r.subscriptionId,
        mock: r.mock,
        tier: r.tier,
      });
    }
    const v = await http<ApiSubscriptionStartView>("/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    return { url: v.url, subscription_id: v.subscriptionId, mock: v.mock, tier: v.tier };
  },

  /**
   * Confirm a Polar checkout after the post-payment redirect (POST
   * /billing/confirm). Used when webhooks can't reach the API (e.g. localhost):
   * the API verifies the checkout is paid with Polar and grants the plan. Safe
   * to call with a stale/unpaid id - the API returns updated:false. Mock mode
   * already granted at subscribe time, so this is a no-op.
   */
  async confirmCheckout(checkoutId: string): Promise<{ plan: string; updated: boolean }> {
    if (USING_MOCK_API) return delay({ plan: "free", updated: false });
    return http<{ plan: string; updated: boolean }>("/billing/confirm", {
      method: "POST",
      body: JSON.stringify({ checkoutId }),
    });
  },

  /**
   * Cancel the org's Polar subscription (POST /billing/subscription/cancel).
   * Downgrades to free (at period end in real mode, immediately in mock).
   */
  async cancelSubscription(): Promise<{ ok: boolean; plan: string }> {
    if (USING_MOCK_API) return delay(mockStore.cancelSubscription());
    return http<{ ok: boolean; plan: string }>("/billing/subscription/cancel", {
      method: "POST",
    });
  },

  /**
   * Upload a local video file. The real API exposes POST /uploads (multipart,
   * field "file") and returns { sourceKey } - a workspace-relative path the
   * pipeline ingests as a local file. We normalize to { source_key }; the
   * caller then createJob({ source_type: "upload", source_key }). Mock mode
   * registers a deterministic upload id so a later createJob makes a demo job.
   */
  async uploadFile(file: File): Promise<{ source_key: string }> {
    if (USING_MOCK_API) return delay(mockStore.uploadFile(file), 400);
    // Multipart form - DON'T set Content-Type (the browser adds the boundary).
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/uploads`, {
      method: "POST",
      body: form,
      headers: await authHeader(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
    }
    const v = (await res.json()) as { sourceKey: string };
    return { source_key: v.sourceKey };
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
