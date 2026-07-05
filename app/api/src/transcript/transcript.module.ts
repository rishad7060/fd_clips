import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';
import { TranscriptRateLimitGuard } from './rate-limit.guard';

/**
 * Free, public "YouTube to Transcript" tool (POST /transcript). Spawns
 * pipeline/transcript.py to pull a video's captions via yt-dlp with NO API keys
 * and NO video download. No auth guard - it's an organic-SEO surface for
 * anonymous visitors, but a per-IP rate limiter (registered here as a singleton
 * so its in-memory window persists across requests) throttles abuse.
 */
@Module({
  controllers: [TranscriptController],
  providers: [TranscriptRateLimitGuard],
})
export class TranscriptModule {}
