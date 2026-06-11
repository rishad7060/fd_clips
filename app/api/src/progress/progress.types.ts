import { JobStage, JobStatus } from '../persistence/store.types';

/**
 * JobProgressEvent — CONTRACTS.md §4. Emitted by the worker (or the mock
 * worker) and relayed to the web app over WebSocket on room `job:{job_id}`.
 * snake_case on the wire to match the worker contract.
 */
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

export const PROGRESS_BUS = Symbol('PROGRESS_BUS');

/**
 * Decouples the progress producer (worker/mock queue) from the consumer
 * (WebSocket gateway). In real mode this is backed by a Redis subscription;
 * locally it is an in-process EventEmitter.
 */
export interface ProgressBus {
  publish(event: JobProgressEvent): void;
  subscribe(listener: (event: JobProgressEvent) => void): () => void;
}
