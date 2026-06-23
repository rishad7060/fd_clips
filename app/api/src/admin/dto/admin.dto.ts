import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { JobStatus, PlanTier, UserRole } from '../../persistence/store.types';

const JOB_STATUSES: JobStatus[] = ['queued', 'running', 'completed', 'failed', 'canceled'];
const PLAN_TIERS: PlanTier[] = ['free', 'starter', 'pro'];
const USER_ROLES: UserRole[] = ['user', 'admin'];

/** Shared pagination + search query params. */
export class ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class OverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  rangeDays?: number;
}

export class JobsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(JOB_STATUSES)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class ClipsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;
}

export class LedgerQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class AdjustCreditsDto {
  /** Positive grants, negative refunds/debits. */
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class SetPlanDto {
  @IsIn(PLAN_TIERS)
  plan!: PlanTier;
}

export class SetRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;
}

/** Admin edit to a plan tier. All fields optional (partial update). */
export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  priceUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  monthlyCredits?: number;

  @IsOptional()
  @IsBoolean()
  watermark?: boolean;

  @IsOptional()
  @IsBoolean()
  editingEnabled?: boolean;

  // null = indefinite retention; omit to leave unchanged.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  clipRetentionDays?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  maxResolution?: string;
}

export const PLAN_TIER_VALUES = PLAN_TIERS;
