import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PlanTier } from '../persistence/store.types';
import { AdminService } from './admin.service';
import {
  AdjustCreditsDto,
  ClipsQueryDto,
  JobsQueryDto,
  LedgerQueryDto,
  ListQueryDto,
  OverviewQueryDto,
  PLAN_TIER_VALUES,
  SetPlanDto,
  SetRoleDto,
  UpdatePlanDto,
} from './dto/admin.dto';

/**
 * Cross-tenant admin API. Every route is gated by AdminGuard (valid HS256 token
 * with role=admin). These endpoints intentionally bypass org scoping.
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview(@Query() q: OverviewQueryDto) {
    return this.admin.overview(q.rangeDays ?? 30);
  }

  // ── Organizations ─────────────────────────────────────────────────────────
  @Get('organizations')
  listOrganizations(@Query() q: ListQueryDto) {
    return this.admin.listOrganizations(q);
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.admin.getOrganization(id);
  }

  @Post('organizations/:id/credits')
  @HttpCode(200)
  adjustCredits(@Param('id') id: string, @Body() dto: AdjustCreditsDto) {
    return this.admin.adjustCredits(id, dto.amount, dto.note);
  }

  @Patch('organizations/:id/plan')
  setPlan(@Param('id') id: string, @Body() dto: SetPlanDto) {
    return this.admin.setOrgPlan(id, dto.plan);
  }

  @Delete('organizations/:id')
  deleteOrganization(@Param('id') id: string) {
    return this.admin.deleteOrganization(id);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  @Get('users')
  listUsers(@Query() q: ListQueryDto) {
    return this.admin.listUsers(q);
  }

  @Patch('users/:id/role')
  setUserRole(@Param('id') id: string, @Body() dto: SetRoleDto) {
    return this.admin.setUserRole(id, dto.role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────
  @Get('jobs')
  listJobs(@Query() q: JobsQueryDto) {
    return this.admin.listJobs(q);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(200)
  cancelJob(@Param('id') id: string) {
    return this.admin.cancelJob(id);
  }

  @Delete('jobs/:id')
  deleteJob(@Param('id') id: string) {
    return this.admin.deleteJob(id);
  }

  // ── Clips ─────────────────────────────────────────────────────────────────
  @Get('clips')
  listClips(@Query() q: ClipsQueryDto) {
    return this.admin.listClips(q);
  }

  @Delete('clips/:id')
  deleteClip(@Param('id') id: string) {
    return this.admin.deleteClip(id);
  }

  // ── Billing / system ──────────────────────────────────────────────────────
  @Get('ledger')
  listLedger(@Query() q: LedgerQueryDto) {
    return this.admin.listLedger(q);
  }

  @Get('plans')
  plans() {
    return this.admin.plans();
  }

  @Patch('plans/:tier')
  updatePlan(@Param('tier') tier: string, @Body() dto: UpdatePlanDto) {
    if (!PLAN_TIER_VALUES.includes(tier as PlanTier)) {
      throw new BadRequestException(`Unknown plan tier: ${tier}`);
    }
    return this.admin.updatePlan(tier as PlanTier, dto);
  }

  @Get('system')
  system() {
    return this.admin.system();
  }
}
