import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { JobProgressEvent, ProgressBus } from './progress.types';

const CHANNEL = 'progress';

/**
 * In-process progress bus (local dev). The same interface would be backed by
 * a Redis pub/sub subscriber in real mode; the gateway and producers are
 * unaffected by which backend is used.
 */
@Injectable()
export class InProcessProgressBus implements ProgressBus {
  private readonly logger = new Logger(InProcessProgressBus.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many WS subscribers may attach; lift the default cap.
    this.emitter.setMaxListeners(0);
  }

  publish(event: JobProgressEvent): void {
    this.emitter.emit(CHANNEL, event);
  }

  subscribe(listener: (event: JobProgressEvent) => void): () => void {
    this.emitter.on(CHANNEL, listener);
    return () => this.emitter.off(CHANNEL, listener);
  }
}
