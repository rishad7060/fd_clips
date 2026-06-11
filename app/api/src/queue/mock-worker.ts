import { Logger } from '@nestjs/common';
import { DataStore } from '../persistence/store.types';
import { JobStage, JobStatus } from '../persistence/store.types';
import { JobProgressEvent, ProgressBus } from '../progress/progress.types';
import { JobQueuePayload } from './queue.types';

/**
 * Per-stage progress weights from CONTRACTS.md §4. The mock worker walks these
 * to emit a realistic progression and then materializes clips from the
 * deterministic heuristic (mirroring the real worker's score_clips output).
 */
const STAGES: { stage: JobStage; to: number; message: string }[] = [
  { stage: 'ingest', to: 10, message: 'Downloading & normalizing source' },
  { stage: 'transcribe', to: 35, message: 'Transcribing audio' },
  { stage: 'score', to: 45, message: 'Scoring clip candidates' },
  { stage: 'extract', to: 55, message: 'Cutting clips' },
  { stage: 'reframe', to: 80, message: 'Reframing to 9:16' },
  { stage: 'captions', to: 100, message: 'Burning captions' },
];

// Canned candidates mirroring tests/fixtures/clips.sample.json shape so the
// mock pipeline yields realistic clips without the Python worker.
const MOCK_CANDIDATES = [
  {
    start: 16.28,
    end: 27.71,
    hookLine: 'The real killer is building something nobody actually wants.',
    viralityScore: 92,
    reason: 'Strong contrarian hook plus a raw personal confession. Complete thought, highly quotable.',
    suggestedTitle: 'The #1 Reason Startups Really Fail',
  },
  {
    start: 50.12,
    end: 62.04,
    hookLine: 'Fall in love with the problem, not the solution.',
    viralityScore: 90,
    reason: 'Memorable, tweetable maxim with immediate elaboration. Lands as a mic-drop.',
    suggestedTitle: 'Fall In Love With The Problem',
  },
  {
    start: 33.36,
    end: 44.18,
    hookLine: 'Talk to ten customers before you write a single line of code.',
    viralityScore: 84,
    reason: 'Concrete, actionable rule with a clean if-then payoff. High practical value.',
    suggestedTitle: 'The Ten-Customer Rule',
  },
  {
    start: 0.32,
    end: 11.07,
    hookLine: "The number one reason startups fail isn't what you think.",
    viralityScore: 78,
    reason: 'Open-loop curiosity hook that sets up a strong question.',
    suggestedTitle: 'Why Most Startups Fail In Year One',
  },
  {
    start: 56.18,
    end: 67.51,
    hookLine: 'The founders who win are obsessed with the pain, not their own cleverness.',
    viralityScore: 75,
    reason: 'Quotable insight reinforced by social proof from the co-host.',
    suggestedTitle: 'Obsessed With The Pain',
  },
  {
    start: 44.42,
    end: 55.94,
    hookLine: 'A lot of founders fall in love with their idea. How do you stay honest?',
    viralityScore: 71,
    reason: 'Good question-and-answer arc on founder self-deception.',
    suggestedTitle: 'How Founders Stay Honest',
  },
  {
    start: 21.89,
    end: 33.12,
    hookLine: 'I spent eighteen months building a product zero people needed.',
    viralityScore: 68,
    reason: 'Vulnerable failure story with relatable stakes.',
    suggestedTitle: 'I Wasted 18 Months On The Wrong Product',
  },
  {
    start: 6.42,
    end: 16.04,
    hookLine: "Everybody says funding is the killer. You're telling me that's wrong?",
    viralityScore: 61,
    reason: 'Decent myth-busting setup and back-and-forth.',
    suggestedTitle: "Funding Isn't The Startup Killer",
  },
] as const;

export interface MockWorkerDeps {
  store: DataStore;
  bus: ProgressBus;
  /** Called when a job fails so charged credits can be refunded. */
  onFailure: (organizationId: string, jobId: string, creditsCharged: number) => Promise<void>;
  /** Delay between stage ticks (ms). Small so local runs finish quickly. */
  stepDelayMs?: number;
}

/**
 * Simulates the GPU worker for local dev: advances job status/stage/progress,
 * publishes JobProgressEvents, and writes Clip rows on completion. Emits the
 * same event shape the real worker would (CONTRACTS.md §4).
 */
export class MockWorker {
  private readonly logger = new Logger(MockWorker.name);
  private readonly stepDelayMs: number;

  constructor(private readonly deps: MockWorkerDeps) {
    this.stepDelayMs = deps.stepDelayMs ?? 150;
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Process one job to completion (fire-and-forget from the queue). */
  async process(payload: JobQueuePayload): Promise<void> {
    const { store } = this.deps;
    const orgId = payload.organization_id;
    const jobId = payload.job_id;
    try {
      await store.updateJob(orgId, jobId, { status: 'running', stage: 'ingest', progress: 0 });
      this.emit(payload, 'running', 'ingest', 0, 'Job started', 0);

      for (const s of STAGES) {
        await this.sleep(this.stepDelayMs);
        await store.updateJob(orgId, jobId, { status: 'running', stage: s.stage, progress: s.to });
        this.emit(payload, 'running', s.stage, s.to, s.message, 0);
      }

      // Materialize clips (top-N by requested clip_count).
      const wanted = Math.max(1, Math.min(payload.clip_count, MOCK_CANDIDATES.length));
      let clipsReady = 0;
      for (let i = 0; i < wanted; i++) {
        const c = MOCK_CANDIDATES[i];
        const rank = i + 1;
        await store.createClip({
          organizationId: orgId,
          jobId,
          rank,
          start: c.start,
          end: c.end,
          hookLine: c.hookLine,
          viralityScore: c.viralityScore,
          reason: c.reason,
          suggestedTitle: c.suggestedTitle,
          // R2 keys per CONTRACTS.md §5.
          finalKey: `${orgId}/${jobId}/clips/${rank}_final.mp4`,
          thumbKey: `${orgId}/${jobId}/clips/${rank}_thumb.jpg`,
        });
        clipsReady = rank;
      }

      await store.updateJob(orgId, jobId, { status: 'completed', stage: 'done', progress: 100 });
      this.emit(payload, 'completed', 'done', 100, `${clipsReady} clips ready`, clipsReady);
      this.logger.log(`Mock job ${jobId} completed with ${clipsReady} clips.`);
    } catch (err) {
      const message = (err as Error).message;
      await store.updateJob(orgId, jobId, { status: 'failed', stage: 'ingest', progress: 0, error: message });
      this.emit(payload, 'failed', 'ingest', 0, 'Job failed', 0, message);
      const job = await store.getJob(orgId, jobId);
      if (job && job.creditsCharged > 0) {
        await this.deps.onFailure(orgId, jobId, job.creditsCharged);
      }
      this.logger.error(`Mock job ${jobId} failed: ${message}`);
    }
  }
}
