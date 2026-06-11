import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { DataStore, JobStage, JobStatus } from '../persistence/store.types';
import { JobProgressEvent, ProgressBus } from '../progress/progress.types';
import { JobQueuePayload, JobWorker } from './queue.types';

/**
 * Repo root: pipeline/run.py resolves its workspace/ relative to here, so the
 * child must be spawned with this cwd. This file lives at
 * app/api/src/queue/real-pipeline.worker.ts, so the root is five levels up.
 */
const REPO_ROOT =
  process.env.PIPELINE_REPO_ROOT && process.env.PIPELINE_REPO_ROOT.trim() !== ''
    ? path.resolve(process.env.PIPELINE_REPO_ROOT)
    : path.resolve(__dirname, '..', '..', '..', '..');
const PYTHON_BIN = 'python';
const RUN_PY = 'pipeline/run.py';

/** One '@@PROGRESS@@ {json}' line from run.py (CONTRACTS.md §4 weights). */
interface PipelineProgress {
  type: string;
  stage: JobStage;
  status: string;
  progress: number;
  message: string;
}

/** One row of the final '@@RESULT@@ {json}' summary from run.py. */
interface PipelineResultRow {
  rank: number;
  score: number;
  hook: string;
  title: string;
  start: number;
  end: number;
  duration: number;
  final_path: string;
  final_exists: boolean;
}

/** A candidate as written to workspace/<job-id>/clips.json (CONTRACTS.md §3). */
interface ClipCandidate {
  start: number;
  end: number;
  hook_line: string;
  virality_score: number;
  reason: string;
  suggested_title?: string;
}

interface ClipsDoc {
  job_id: string;
  model: string;
  candidates: ClipCandidate[];
}

export interface RealPipelineWorkerDeps {
  store: DataStore;
  bus: ProgressBus;
  /** Called when a job fails so charged credits can be refunded. */
  onFailure: (organizationId: string, jobId: string, creditsCharged: number) => Promise<void>;
  /** Repo root to spawn python from (defaults to the resolved REPO_ROOT). */
  repoRoot?: string;
  /** Python executable on PATH (defaults to 'python'). */
  pythonBin?: string;
}

/**
 * Real worker for local dev (no Redis): spawns the Python pipeline
 * (pipeline/run.py --json-progress), forwards its @@PROGRESS@@ lines as
 * JobProgressEvents, then materializes Clip rows from
 * workspace/<job-id>/clips.json on a clean exit. Same shape/contract as
 * MockWorker so the MemoryQueue can drive either (CONTRACTS.md §1/§3/§4/§5).
 */
export class RealPipelineWorker implements JobWorker {
  private readonly logger = new Logger(RealPipelineWorker.name);
  private readonly repoRoot: string;
  private readonly pythonBin: string;

  constructor(private readonly deps: RealPipelineWorkerDeps) {
    this.repoRoot = deps.repoRoot ?? REPO_ROOT;
    this.pythonBin = deps.pythonBin ?? PYTHON_BIN;
  }

  private emit(
    payload: JobQueuePayload,
    status: JobStatus,
    stage: JobStage,
    progress: number,
    message: string,
    clipsReady: number,
    error: string | null = null,
  ): void {
    const event: JobProgressEvent = {
      job_id: payload.job_id,
      organization_id: payload.organization_id,
      status,
      stage,
      progress,
      message,
      clips_ready: clipsReady,
      error,
      ts: new Date().toISOString(),
    };
    this.deps.bus.publish(event);
  }

  /** Process one job to completion (fire-and-forget from the queue). */
  async process(payload: JobQueuePayload): Promise<void> {
    const { store } = this.deps;
    const orgId = payload.organization_id;
    const jobId = payload.job_id;

    try {
      await store.updateJob(orgId, jobId, { status: 'running', stage: 'ingest', progress: 0 });
      this.emit(payload, 'running', 'ingest', 0, 'Job started', 0);

      const source = payload.source_url ?? payload.source_key ?? '';
      if (!source) {
        throw new Error('No source_url or source_key on payload');
      }

      const result = await this.runPipeline(payload, source);
      await this.materializeClips(payload, result);
    } catch (err) {
      const message = (err as Error).message;
      await store.updateJob(orgId, jobId, {
        status: 'failed',
        stage: 'ingest',
        progress: 0,
        error: message,
      });
      this.emit(payload, 'failed', 'ingest', 0, 'Job failed', 0, message);
      const job = await store.getJob(orgId, jobId);
      if (job && job.creditsCharged > 0) {
        await this.deps.onFailure(orgId, jobId, job.creditsCharged);
      }
      this.logger.error(`Real pipeline job ${jobId} failed: ${message}`);
    }
  }

  /**
   * Spawn pipeline/run.py and forward its @@PROGRESS@@ lines as progress
   * events. Resolves with the parsed @@RESULT@@ summary (or null) on exit 0;
   * rejects on a non-zero exit or spawn error.
   */
  private runPipeline(
    payload: JobQueuePayload,
    source: string,
  ): Promise<{ rows: PipelineResultRow[] } | null> {
    const orgId = payload.organization_id;
    const jobId = payload.job_id;

    return new Promise((resolve, reject) => {
      const args = [
        RUN_PY,
        source,
        '--clips',
        String(payload.clip_count),
        '--job-id',
        jobId,
        '--json-progress',
      ];
      this.logger.log(`Spawning ${this.pythonBin} ${args.join(' ')} (cwd=${this.repoRoot})`);

      const child = spawn(this.pythonBin, args, { cwd: this.repoRoot });

      let stdoutBuf = '';
      let stderrTail = '';
      let result: { rows: PipelineResultRow[] } | null = null;
      let clipsReady = 0;
      let settled = false;

      const handleLine = (line: string): void => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('@@PROGRESS@@ ')) {
          const json = trimmed.slice('@@PROGRESS@@ '.length);
          try {
            const p = JSON.parse(json) as PipelineProgress;
            void this.deps.store.updateJob(orgId, jobId, {
              status: 'running',
              stage: p.stage,
              progress: p.progress,
            });
            this.emit(payload, 'running', p.stage, p.progress, p.message, clipsReady);
          } catch (e) {
            this.logger.warn(`Bad @@PROGRESS@@ line for ${jobId}: ${(e as Error).message}`);
          }
        } else if (trimmed.startsWith('@@RESULT@@ ')) {
          const json = trimmed.slice('@@RESULT@@ '.length);
          try {
            const summary = JSON.parse(json) as { rows?: PipelineResultRow[] };
            const rows = Array.isArray(summary.rows) ? summary.rows : [];
            clipsReady = rows.filter((r) => r.final_exists).length;
            result = { rows };
          } catch (e) {
            this.logger.warn(`Bad @@RESULT@@ line for ${jobId}: ${(e as Error).message}`);
          }
        }
      };

      child.stdout.setEncoding('utf-8');
      child.stdout.on('data', (chunk: string) => {
        stdoutBuf += chunk;
        let idx: number;
        while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
          const line = stdoutBuf.slice(0, idx);
          stdoutBuf = stdoutBuf.slice(idx + 1);
          handleLine(line);
        }
      });

      child.stderr.setEncoding('utf-8');
      child.stderr.on('data', (chunk: string) => {
        // Keep only a bounded tail so a noisy pipeline can't blow up memory.
        stderrTail = (stderrTail + chunk).slice(-8000);
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(new Error(`Failed to spawn pipeline: ${err.message}`));
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        // Flush any trailing partial line.
        if (stdoutBuf.trim()) handleLine(stdoutBuf);
        if (code === 0) {
          resolve(result);
        } else {
          if (stderrTail.trim()) {
            this.logger.error(`Pipeline stderr for ${jobId}:\n${stderrTail.trim()}`);
          }
          reject(new Error(`Pipeline exited with code ${code ?? 'null'}`));
        }
      });
    });
  }

  /**
   * Read workspace/<job-id>/clips.json and create one Clip row per candidate
   * (top clip_count, ranked by order). finalKey/thumbKey use the R2-shaped key
   * the storage layer maps back to workspace/<job-id>/clips/<rank>_final.mp4
   * (CONTRACTS.md §5).
   */
  private async materializeClips(
    payload: JobQueuePayload,
    result: { rows: PipelineResultRow[] } | null,
  ): Promise<void> {
    const { store } = this.deps;
    const orgId = payload.organization_id;
    const jobId = payload.job_id;

    const clipsPath = path.join(this.repoRoot, 'workspace', jobId, 'clips.json');
    const raw = await readFile(clipsPath, 'utf-8');
    const doc = JSON.parse(raw) as ClipsDoc;
    const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];

    // Take up to clip_count candidates — but DON'T floor at 1: the scorer can
    // legitimately return 0 (e.g. a short video with no 20-60s complete-thought
    // segment). Flooring at 1 here previously indexed candidates[0]===undefined
    // and crashed with "Cannot read properties of undefined (reading 'start')".
    const wanted = Math.min(payload.clip_count, candidates.length);
    let clipsReady = 0;
    for (let i = 0; i < wanted; i++) {
      const c = candidates[i];
      if (!c) break; // defensive: never index past the real candidate list
      const rank = i + 1;
      await store.createClip({
        organizationId: orgId,
        jobId,
        rank,
        start: c.start,
        end: c.end,
        hookLine: c.hook_line,
        viralityScore: c.virality_score,
        reason: c.reason,
        suggestedTitle: c.suggested_title ?? '',
        // R2-shaped keys (CONTRACTS.md §5); the file lives at
        // workspace/<jobId>/clips/<rank>_final.mp4 — the storage layer maps
        // this key back to that local file when serving.
        finalKey: `${orgId}/${jobId}/clips/${rank}_final.mp4`,
        thumbKey: `${orgId}/${jobId}/clips/${rank}_thumb.jpg`,
      });
      clipsReady = rank;
    }

    await store.updateJob(orgId, jobId, { status: 'completed', stage: 'done', progress: 100 });
    const doneMsg =
      clipsReady > 0
        ? `${clipsReady} clip${clipsReady === 1 ? '' : 's'} ready`
        : 'No clips found — the video had no 20-60s standout moment. Try a longer/more substantive video.';
    this.emit(payload, 'completed', 'done', 100, doneMsg, clipsReady);
    this.logger.log(
      `Real pipeline job ${jobId} completed with ${clipsReady} clips` +
        (result ? ` (${result.rows.length} rows reported).` : '.'),
    );
  }
}
