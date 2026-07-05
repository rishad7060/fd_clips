import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Tiny dependency-free per-IP rate limiter for the public transcript tool.
 *
 * Each request spawns a Python/yt-dlp process, so an unthrottled public endpoint
 * is an abuse vector. Rather than pull in @nestjs/throttler (a new dep that must
 * also land in the Docker image), this keeps a small in-memory sliding window of
 * hit timestamps per client IP. It fits the single-container, in-process API
 * deployment (the same place the queue + worker already run in-process). If the
 * API is ever horizontally scaled, swap this for a Redis-backed limiter.
 */
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 8; // requests per IP per window
const MAX_TRACKED_IPS = 10_000; // safety cap so the map can't grow unbounded

@Injectable()
export class TranscriptRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = 0;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.clientIp(req);
    const now = Date.now();

    this.sweep(now);

    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_HITS) {
      const retryMs = WINDOW_MS - (now - recent[0]);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many transcript requests. Try again in ${Math.ceil(retryMs / 1000)}s.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(ip, recent);
    return true;
  }

  /** Best-effort client IP, honoring a single proxy hop (compose/ingress). */
  private clientIp(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
      return fwd.split(',')[0].trim();
    }
    if (Array.isArray(fwd) && fwd.length > 0) {
      return fwd[0].split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
  }

  /** Periodically drop stale IP buckets so the map doesn't grow unbounded. */
  private sweep(now: number): void {
    if (now - this.lastSweep < WINDOW_MS && this.hits.size < MAX_TRACKED_IPS) {
      return;
    }
    this.lastSweep = now;
    for (const [ip, times] of this.hits) {
      const live = times.filter((t) => now - t < WINDOW_MS);
      if (live.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, live);
      }
    }
  }
}
