import type {
  Clip,
  ClipsResponse,
  ClipTranscript,
  CreateJobInput,
  Job,
  JobProgressEvent,
  JobStage,
  RenderClipInput,
  VideoPreview,
} from "../types";
import { DEFAULT_STYLE } from "../templates";
import { SAMPLE_CLIPS, captionsFor, wordsFor } from "./fixtures";
import { posterDataUri } from "./posters";

/**
 * In-memory mock backend that simulates the worker advancing a job through the
 * CONTRACTS §1 stages. Lives module-level so it persists for the lifetime of a
 * browser session (this module is imported only on the client by the mock API
 * client). Deterministic and offline — no network, no backend required.
 */

const ORG_ID = "org_demo_focaldive";
const MOCK_PUBLIC_VIDEO =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";

// Per-stage overall-progress ceilings, per CONTRACTS §4 weights.
const STAGE_CEIL: Record<JobStage, number> = {
  ingest: 10,
  transcribe: 35,
  score: 45,
  extract: 55,
  reframe: 80,
  captions: 100,
  done: 100,
};

const STAGE_MESSAGE: Record<JobStage, string> = {
  ingest: "Downloading and normalizing source",
  transcribe: "Transcribing audio (WhisperX)",
  score: "Scoring viral moments",
  extract: "Cutting clips",
  reframe: "Reframing to vertical 9:16",
  captions: "Burning animated captions",
  done: "Clips ready",
};

const ORDER: JobStage[] = [
  "ingest",
  "transcribe",
  "score",
  "extract",
  "reframe",
  "captions",
  "done",
];

interface MockJobRecord {
  job: Job;
  clips: Clip[];
  /** wall-clock ms when the job started progressing. */
  startedAt: number;
  /** total simulated duration in ms. */
  durationMs: number;
  caption_overrides: Record<number, Clip["caption_lines"]>;
}

const records = new Map<string, MockJobRecord>();

/** Monthly grant per paid tier — mirrors PLANS in app/api/src/billing/plans.ts. */
const MOCK_PLAN_CREDITS: Record<"starter" | "pro", number> = {
  starter: 150,
  pro: 300,
};

/** In-session billing state so a mock upgrade updates the balance bar.
 *  Free tier = 60 credits/mo (mirrors PLANS.free in app/api/src/billing/plans.ts). */
let billingState: { plan: string; credit_balance: number; monthly_credits: number } = {
  plan: "free",
  credit_balance: 54,
  monthly_credits: 60,
};

/**
 * source_key -> original filename, populated by mockStore.uploadFile so a later
 * createJob({ source_type: "upload", source_key }) can label the job with the
 * real file name even when the caller doesn't pass source_filename.
 */
const uploadFilenames = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return "demo-job-" + Math.random().toString(36).slice(2, 8);
}

/** A friendly title derived from a URL's host + last path segment (mock preview). */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const slug = seg.replace(/[-_]+/g, " ").replace(/\.[a-z0-9]+$/i, "").trim();
    return slug ? `${slug} — ${host}` : host || "Pasted URL";
  } catch {
    return "Pasted URL";
  }
}

function buildClips(jobId: string): Clip[] {
  return SAMPLE_CLIPS.candidates.map((c, i) => {
    const rank = i + 1;
    return {
      ...c,
      rank,
      job_id: jobId,
      final_url: MOCK_PUBLIC_VIDEO,
      thumb_url: posterDataUri(rank, c.hook_line, c.virality_score),
      caption_lines: captionsFor(c),
    };
  });
}

/** Seed a couple of finished demo jobs so the dashboard isn't empty. */
function seed(): void {
  if (records.size > 0) return;
  const seededIds = ["demo-job-seed01", "demo-job-seed02"];
  const titles = [
    "Why Most Startups Fail — Founder Podcast Ep. 42",
    "The Build-Trap: A Product Strategy Rant",
  ];
  seededIds.forEach((id, idx) => {
    const clips = buildClips(id).slice(0, idx === 0 ? 5 : 6);
    const created = new Date(Date.now() - (idx + 1) * 3600_000).toISOString();
    records.set(id, {
      job: {
        job_id: id,
        organization_id: ORG_ID,
        source_type: "url",
        source_url: "https://www.youtube.com/watch?v=EXAMPLE" + idx,
        source_key: null,
        clip_count: clips.length,
        style: DEFAULT_STYLE,
        status: "completed",
        progress: 100,
        stage: "done",
        error: null,
        created_at: created,
        updated_at: created,
        title: titles[idx],
      },
      clips,
      startedAt: Date.now() - 60_000,
      durationMs: 1,
      caption_overrides: {},
    });
  });
}

/** Advance a running job's derived status/progress based on elapsed time. */
function tick(rec: MockJobRecord): void {
  const job = rec.job;
  if (job.status === "completed" || job.status === "failed" || job.status === "canceled") {
    return;
  }
  const elapsed = Date.now() - rec.startedAt;
  const frac = Math.min(1, elapsed / rec.durationMs);
  const overall = Math.round(frac * 100);

  // Map overall progress to the current stage.
  let stage: JobStage = "ingest";
  for (const s of ORDER) {
    stage = s;
    if (overall <= STAGE_CEIL[s]) break;
  }
  if (overall >= 100) stage = "done";

  job.progress = overall;
  job.stage = stage;
  job.status = overall >= 100 ? "completed" : "running";
  job.updated_at = nowIso();
}

/** Job snapshot carrying the produced-clip count (0 until the job completes). */
function withProduced(rec: MockJobRecord): Job {
  const produced = rec.job.status === "completed" ? rec.clips.length : 0;
  return { ...rec.job, clips_produced: produced };
}

function clipsReady(rec: MockJobRecord): number {
  // Clips become "ready" through the captions stage (80→100).
  const p = rec.job.progress;
  if (p < 80) return 0;
  const total = rec.clips.length;
  return Math.min(total, Math.round(((p - 80) / 20) * total));
}

export const mockStore = {
  orgId: ORG_ID,

  /**
   * Deterministic balance for the offline demo. Starts as the free plan
   * (24/30 used-ish); a mock subscription upgrades it in-session so the
   * billing buttons do something real (grant credits, move the balance bar).
   */
  getBalance(): { plan: string; credit_balance: number; monthly_credits: number } {
    return { ...billingState };
  },

  /**
   * Mock Polar recurring subscription. There is no real redirect offline, so
   * we immediately "activate": set the plan + grant the first month's credits,
   * and return a fake subscription id (mock=true tells the caller not to
   * redirect). Mirrors PolarService.createSubscription's mock branch.
   */
  createSubscription(tier: "starter" | "pro"): {
    url: string;
    subscriptionId: string;
    mock: boolean;
    tier: string;
  } {
    const subscriptionId = `polar_mock_${tier}_${Date.now().toString(36)}`;
    if (MOCK_PLAN_CREDITS[tier]) {
      billingState = {
        plan: tier,
        monthly_credits: MOCK_PLAN_CREDITS[tier],
        credit_balance: MOCK_PLAN_CREDITS[tier],
      };
    }
    return {
      url: `https://mock-polar.local/checkout?product=${tier}`,
      subscriptionId,
      mock: true,
      tier,
    };
  },

  /** Mock cancel: downgrade to the free plan in-session. */
  cancelSubscription(): { ok: boolean; plan: string } {
    billingState = {
      plan: "free",
      monthly_credits: 60,
      credit_balance: billingState.credit_balance,
    };
    return { ok: true, plan: "free" };
  },

  /**
   * Mock file upload: returns a deterministic source_key derived from the file
   * name + size so a subsequent createJob({ source_type: "upload", source_key })
   * makes a demo job. No real bytes are stored — the offline demo just needs a
   * stable key and a friendly filename to label the job.
   */
  uploadFile(file: File): { source_key: string } {
    const slug = file.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 24);
    const sourceKey = `upload-${slug || "video"}-${file.size}`;
    uploadFilenames.set(sourceKey, file.name);
    return { source_key: sourceKey };
  },

  /**
   * Deterministic preview for a pasted URL (offline). Derives a friendly title
   * from the URL, returns a 1080p stub with a poster data-URI so the config
   * screen's preview card always has a thumbnail without any network/yt-dlp.
   */
  getPreview(url: string): VideoPreview {
    const title = titleFromUrl(url);
    return {
      title,
      thumbnail_url: posterDataUri(1, title, 88),
      duration_sec: 525,
      width: 1920,
      height: 1080,
      quality_label: "1080p",
      note: "Mock preview (no metadata fetched).",
    };
  },

  createJob(input: CreateJobInput): Job {
    seed();
    const jobId = uid();
    const created = nowIso();
    const title =
      input.source_type === "url"
        ? (input.source_url ?? "Pasted URL")
        : (input.source_filename ??
          (input.source_key ? uploadFilenames.get(input.source_key) : undefined) ??
          "Uploaded video");
    const clips = buildClips(jobId).slice(0, input.clip_count);
    const job: Job = {
      job_id: jobId,
      organization_id: ORG_ID,
      source_type: input.source_type,
      source_url: input.source_url ?? null,
      source_key: input.source_key ?? null,
      clip_count: input.clip_count,
      style: input.style ?? DEFAULT_STYLE,
      status: "queued",
      progress: 0,
      stage: "ingest",
      error: null,
      created_at: created,
      updated_at: created,
      title,
    };
    records.set(jobId, {
      job,
      clips,
      startedAt: Date.now(),
      // ~14s simulated pipeline so the progress view is satisfying but quick.
      durationMs: 14_000,
      caption_overrides: {},
    });
    return job;
  },

  getJob(jobId: string): Job | null {
    seed();
    const rec = records.get(jobId);
    if (!rec) return null;
    tick(rec);
    return withProduced(rec);
  },

  listJobs(): Job[] {
    seed();
    const all = [...records.values()];
    all.forEach(tick);
    return all
      .map(withProduced)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  progressEvent(jobId: string): JobProgressEvent | null {
    const rec = records.get(jobId);
    if (!rec) return null;
    tick(rec);
    const ready = clipsReady(rec);
    return {
      job_id: jobId,
      organization_id: ORG_ID,
      status: rec.job.status,
      stage: rec.job.stage,
      progress: rec.job.progress,
      message:
        rec.job.status === "completed"
          ? `${rec.clips.length} clips ready`
          : `${STAGE_MESSAGE[rec.job.stage]}${
              rec.job.stage === "captions" ? ` (${ready}/${rec.clips.length})` : ""
            }`,
      clips_ready: ready,
      error: rec.job.error ?? null,
      ts: nowIso(),
    };
  },

  getClips(jobId: string): ClipsResponse | null {
    seed();
    const rec = records.get(jobId);
    if (!rec) return null;
    tick(rec);
    const clips = rec.clips.map((c) => ({
      ...c,
      caption_lines: rec.caption_overrides[c.rank] ?? c.caption_lines,
    }));
    return { job_id: jobId, model: SAMPLE_CLIPS.model, clips };
  },

  /**
   * Per-clip transcript words (clip-relative seconds) for the karaoke subtitle
   * layer. Mirrors the backend GET /clips/transcript shape: clip_start=0,
   * clip_end = clip duration, words derived from SAMPLE_CAPTIONS or synthesized.
   */
  getClipTranscript(jobId: string, rank: number): ClipTranscript | null {
    seed();
    const rec = records.get(jobId);
    if (!rec) return null;
    const clip = rec.clips.find((c) => c.rank === rank);
    if (!clip) return null;
    return {
      job_id: jobId,
      rank: clip.rank,
      clip_start: 0,
      clip_end: +(clip.end - clip.start).toFixed(3),
      words: wordsFor(clip),
    };
  },

  /** Apply a single-clip edit + re-render (10c). Returns the updated clip. */
  renderClip(input: RenderClipInput): Clip | null {
    const rec = records.get(input.job_id);
    if (!rec) return null;
    const clip = rec.clips.find((c) => c.rank === input.rank);
    if (!clip) return null;
    clip.start = input.start;
    clip.end = input.end;
    clip.caption_lines = input.caption_lines;
    rec.caption_overrides[input.rank] = input.caption_lines;
    // Re-render bumps the poster (new style highlight could change it) and url stays.
    clip.thumb_url = posterDataUri(clip.rank, clip.hook_line, clip.virality_score);
    rec.job.style = input.style;
    rec.job.updated_at = nowIso();
    return { ...clip };
  },
};
