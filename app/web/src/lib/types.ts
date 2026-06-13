/**
 * Shared wire types for YT Shorts Clips web app.
 *
 * These mirror CONTRACTS.md. Field names are snake_case to match the
 * pipeline/worker JSON and the queue payloads. The NestJS API may expose
 * camelCase at its DTO boundary, but the mock client and the artifact shapes
 * documented in CONTRACTS.md are snake_case, so we keep snake_case here and
 * normalize at the API client boundary if a real API returns camelCase.
 */

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type JobStage =
  | "ingest"
  | "transcribe"
  | "score"
  | "extract"
  | "reframe"
  | "captions"
  | "done";

export const JOB_STAGES: JobStage[] = [
  "ingest",
  "transcribe",
  "score",
  "extract",
  "reframe",
  "captions",
  "done",
];

export type SourceType = "url" | "upload";

/** Caption / template style (CONTRACTS §1 style object). */
export interface ClipStyle {
  template: string;
  font: string;
  highlight_color: string;
  /** Caption vertical placement; the pipeline maps this to an ASS alignment. */
  alignment?: "top" | "center" | "bottom";
  /** Caption font size override (px in the 1080x1920 canvas); omit = template default. */
  font_size?: number;
}

/** Job, DB / API view (CONTRACTS §1). */
export interface Job {
  job_id: string;
  organization_id: string;
  source_type: SourceType;
  source_url?: string | null;
  source_key?: string | null;
  clip_count: number;
  /** Clips actually produced (may be 0 on a completed job); != clip_count (requested). */
  clips_produced?: number;
  style?: ClipStyle | null;
  status: JobStatus;
  progress: number;
  stage: JobStage;
  error?: string | null;
  created_at: string;
  updated_at: string;
  /** Optional human-friendly title shown in the dashboard (mock convenience). */
  title?: string;
}

/** Live progress event (CONTRACTS §4). */
export interface JobProgressEvent {
  job_id: string;
  organization_id: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  message?: string;
  clips_ready?: number;
  error?: string | null;
  ts: string;
}

/** A scored clip candidate (CONTRACTS §3). */
export interface ClipCandidate {
  start: number;
  end: number;
  hook_line: string;
  /** Short punchy on-screen hook for the banner (≤~6 words); falls back to hook_line. */
  hook_title?: string | null;
  virality_score: number;
  reason: string;
  suggested_title: string;
}

/** clips.json top level (CONTRACTS §3). */
export interface ClipsDocument {
  job_id: string;
  model: string;
  candidates: ClipCandidate[];
}

/**
 * A rendered clip as the web app consumes it: the scored candidate plus the
 * time-limited signed URLs the API mints for the R2 artifacts (CONTRACTS §5).
 * The browser never sees raw R2 keys.
 */
export interface Clip extends ClipCandidate {
  /** 1-based rank, matches order in clips.json.candidates. */
  rank: number;
  job_id: string;
  /** Burned-in deliverable (n_final.mp4). */
  final_url: string;
  /** Poster frame for the gallery card (n_thumb.jpg). */
  thumb_url: string;
  /** Editable caption lines, sliced from transcript for this clip range. */
  caption_lines: CaptionLine[];
}

export interface CaptionLine {
  start: number;
  end: number;
  text: string;
}

export interface ClipsResponse {
  job_id: string;
  model: string;
  clips: Clip[];
}

/** Body for POST /jobs. */
export interface CreateJobInput {
  source_type: SourceType;
  source_url?: string;
  source_key?: string;
  /** Upload file name (mock convenience; real flow uploads to R2 first). */
  source_filename?: string;
  clip_count: number;
  style?: ClipStyle;
  /**
   * MVP: the email the finished clips are delivered to (Resend). The v2 MVP
   * promise is "clips arrive by email in ~30 min", so the submit form collects
   * an email up front. Optional here because the real API may instead derive
   * the recipient from the authenticated Clerk user.
   */
  email?: string;
}

/** Body for a re-render of a single clip (10c). */
export interface RenderClipInput {
  job_id: string;
  rank: number;
  start: number;
  end: number;
  caption_lines: CaptionLine[];
  style: ClipStyle;
}
