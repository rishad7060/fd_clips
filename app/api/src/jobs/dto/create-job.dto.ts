import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

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
}
