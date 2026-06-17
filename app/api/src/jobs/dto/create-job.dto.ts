import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Optional time window to process ("Credit saver"): only [start, end] seconds of
 * the source are ingested/scored. Omitted = whole video (current behavior).
 */
export class ProcessRangeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  start!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  end!: number;
}

/**
 * POST /jobs body (camelCase at the API boundary; CONTRACTS.md §1).
 * Either sourceUrl (source_type=url) or sourceKey (source_type=upload).
 */
export class CreateJobDto {
  @IsIn(['url', 'upload'])
  sourceType!: 'url' | 'upload';

  @ValidateIf((o) => o.sourceType === 'url')
  @IsUrl({ require_protocol: true })
  sourceUrl?: string;

  @ValidateIf((o) => o.sourceType === 'upload')
  @IsString()
  sourceKey?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  clipCount!: number;

  /**
   * Delivery email (MVP): the worker emails the finished clips here (Resend).
   * Optional so existing/mock-auth callers without an email still validate.
   */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  /**
   * Source duration in seconds. Used to compute credit cost (source-minutes).
   * In real mode the worker confirms duration after ingest; the API charges an
   * up-front estimate here (refunded on failure). Optional: defaults to a
   * 1-minute minimum charge if omitted.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec?: number;

  // ── Opus-style clip-generation config (all optional; defaults = current
  // behavior). camelCase at the DTO boundary; the worker forwards them to
  // run.py --config-json as snake_case. Every field MUST be declared here or
  // forbidNonWhitelisted strips it. ─────────────────────────────────────────

  /** Output dimensions for the reframe stage. Default "9:16". */
  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9'])
  aspectRatio?: '9:16' | '1:1' | '16:9';

  /** Bias selected clip length. Default "auto" (current 15-90s). */
  @IsOptional()
  @IsIn(['auto', 'short', 'medium', 'long'])
  clipLength?: 'auto' | 'short' | 'medium' | 'long';

  /** Bias the AI scoring/hook style by content genre. Default "auto". */
  @IsOptional()
  @IsIn([
    'auto',
    'podcast',
    'marketing',
    'motivational',
    'webinar',
    'educational',
    'comedy',
  ])
  genre?:
    | 'auto'
    | 'podcast'
    | 'marketing'
    | 'motivational'
    | 'webinar'
    | 'educational'
    | 'comedy';

  /** Free-text instruction biasing selection (e.g. "find clips about pricing"). */
  @IsOptional()
  @IsString()
  includeMoments?: string;

  /** Only process this [start,end] second window of the source. Default: whole. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessRangeDto)
  processRange?: ProcessRangeDto;
}
