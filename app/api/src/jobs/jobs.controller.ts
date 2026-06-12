import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext } from '../auth/auth.types';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { JobView, toJobView } from './jobs.mapper';

@UseGuards(ClerkAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  /** POST /jobs — validate credits, debit, enqueue. Returns the queued job. */
  @Post()
  @HttpCode(201)
  async create(@CurrentOrg() auth: AuthContext, @Body() dto: CreateJobDto): Promise<JobView> {
    const job = await this.jobs.create(auth.organizationId, dto);
    return toJobView(job);
  }

  /** GET /jobs — list this org's jobs (most recent first), with produced-clip counts. */
  @Get()
  async list(@CurrentOrg() auth: AuthContext): Promise<{ jobs: JobView[] }> {
    const rows = await this.jobs.listWithClipCounts(auth.organizationId);
    return { jobs: rows.map(({ job, clipsProduced }) => toJobView(job, clipsProduced)) };
  }

  /** GET /jobs/:id — status + progress (with produced-clip count). */
  @Get(':id')
  async get(@CurrentOrg() auth: AuthContext, @Param('id') id: string): Promise<JobView> {
    const job = await this.jobs.get(auth.organizationId, id);
    const clipsProduced = await this.jobs.clipsProduced(auth.organizationId, id);
    return toJobView(job, clipsProduced);
  }
}
