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
  /** Opus-style auto-hook: white box with the hook at the top for the first 5s.
   *  Defaults to on in the pipeline; set false to "Disable it". */
  hook_overlay?: boolean;
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

/** One transcript word, CLIP-RELATIVE seconds (matches GET /clips/transcript). */
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

/** Per-clip transcript words (clip-relative), feeding the karaoke subtitle layer. */
export interface ClipTranscript {
  job_id: string;
  rank: number;
  clip_start: number;
  clip_end: number;
  words: TranscriptWord[];
}

/**
 * Two-layer caption editor model. The HOOK layer is the white-marker banner box
 * (one editable line near the top); the SUBTITLE layer is the per-word karaoke
 * captions built from the real transcript words (usually bottom). They are
 * INDEPENDENT: editing one never touches the other.
 */
export interface HookLayer {
  text: string;
  show: boolean;
  /** Text color (default white). */
  color: string;
  /** Box / background color (default black - the "white marker" look). */
  boxColor: string;
  position: "top" | "center" | "bottom";
  /** Font size px in the preview; 0 = template default. */
  fontSize: number;
}

/**
 * A karaoke subtitle segment: a run of consecutive transcript words (clip-
 * relative seconds). `textOverride`, when set, replaces the per-word text (per-
 * word timing no longer maps cleanly, so the override renders as one block).
 */
export interface SubtitleSegment {
  id: string;
  startRel: number;
  endRel: number;
  words: TranscriptWord[];
  textOverride?: string;
}

export interface SubtitleLayer {
  show: boolean;
  highlightColor: string;
  position: "top" | "center" | "bottom";
  fontSize: number;
  segments: SubtitleSegment[];
}

export interface ClipsResponse {
  job_id: string;
  model: string;
  clips: Clip[];
}

/**
 * Current org plan + credit balance (GET /billing/balance). `monthly_credits`
 * is the plan's monthly grant (free=60, starter=150, pro=300), used by the UI
 * to render a balance/quota bar. The API returns only plan + creditBalance; the
 * web client derives monthly_credits from a plan→credits map.
 */
export interface CreditBalance {
  plan: string;
  credit_balance: number;
  monthly_credits: number;
}

/** Output aspect ratio for the reframe stage. */
export type AspectRatio = "9:16" | "1:1" | "16:9";

/** Clip-length bias for selection. */
export type ClipLength = "auto" | "short" | "medium" | "long";

/** Content genre biasing the AI scoring/hook style. */
export type Genre =
  | "auto"
  | "podcast"
  | "marketing"
  | "motivational"
  | "webinar"
  | "educational"
  | "comedy";

/** Time window (seconds) of the source to process ("Credit saver"). */
export interface ProcessRange {
  start: number;
  end: number;
}

/**
 * Lightweight preview metadata for a pasted video URL (GET-equivalent of
 * POST /preview). Fetched WITHOUT downloading the video so the config screen can
 * show a thumbnail + title + a resolution badge (`quality_label`, e.g. "4K").
 * snake_case on the web side; the API client maps the camelCase /preview view.
 * `note` is an optional soft message when only a stub could be produced (mock
 * mode, private/unsupported URL) - the UI may surface it but must not treat it
 * as an error.
 */
export interface VideoPreview {
  title: string;
  thumbnail_url: string;
  duration_sec: number;
  width: number;
  height: number;
  /** Resolution badge derived from height: "4K" | "1080p" | "720p" | "360p". */
  quality_label: string;
  note?: string;
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
  // ── Opus-style clip-generation config (all optional; omitted = current
  // behavior: 9:16, auto length, auto genre, no focus, whole video). snake_case
  // on the web side; the API client maps these to the camelCase DTO. ─────────
  /** Output dimensions for the reframe stage. Default "9:16". */
  aspect_ratio?: AspectRatio;
  /** Bias the selected clip length. Default "auto". */
  clip_length?: ClipLength;
  /** Bias the AI scoring/hook style by genre. Default "auto". */
  genre?: Genre;
  /** Free-text instruction biasing selection (e.g. "find clips about pricing"). */
  include_moments?: string;
  /** Only process this [start,end] second window of the source. Default: whole. */
  process_range?: ProcessRange;
}

/** Body for a re-render of a single clip (10c). */
export interface RenderClipInput {
  job_id: string;
  rank: number;
  start: number;
  end: number;
  caption_lines: CaptionLine[];
  style: ClipStyle;
  /**
   * Edited subtitle WORDS (clip-relative seconds) from the inline editor. When
   * present, the renderer burns these instead of re-deriving from the transcript
   * - so text edits appear in the downloadable file.
   */
  captions?: TranscriptWord[];
}
