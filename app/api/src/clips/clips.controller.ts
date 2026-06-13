import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext } from '../auth/auth.types';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { StorageService } from '../storage/storage.service';
import { RenderClipDto } from './dto/render-clip.dto';

// Repo root: pipeline/render_one.py resolves workspace/ relative to here.
// This file is app/api/src/clips/clips.controller.ts → up 4 to the repo root.
const REPO_ROOT =
  process.env.PIPELINE_REPO_ROOT ||
  path.resolve(__dirname, '..', '..', '..', '..');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';

/** API view of a Clip with signed (never raw) URLs. CONTRACTS.md §3/§5. */
interface ClipView {
  clipId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  hookTitle: string | null;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
}

@UseGuards(ClerkAuthGuard)
@Controller('clips')
export class ClipsController {
  private readonly logger = new Logger(ClipsController.name);

  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly storage: StorageService,
  ) {}

  /**
   * POST /clips/render — re-render ONE clip with a new trim and/or caption
   * style. Spawns pipeline/render_one.py, updates the Clip row's start/end, and
   * returns the refreshed view. Only available when the real pipeline is on
   * (USE_REAL_PIPELINE); mock mode has no files to re-cut.
   */
  @Post('render')
  async render(
    @CurrentOrg() auth: AuthContext,
    @Body() dto: RenderClipDto,
  ): Promise<ClipView> {
    if (process.env.USE_REAL_PIPELINE !== 'true') {
      throw new BadRequestException(
        'Re-rendering needs the real pipeline (USE_REAL_PIPELINE=true).',
      );
    }
    // Authorize: the clip must exist and belong to this org.
    const clips = await this.store.listClips(auth.organizationId, dto.jobId);
    const clip = clips.find((c) => c.rank === dto.rank);
    if (!clip) {
      throw new NotFoundException(`Clip #${dto.rank} not found for job ${dto.jobId}`);
    }

    await this.runRenderOne(dto);

    // Persist the new trim on the Clip row so the gallery reflects it.
    const newStart = dto.start ?? clip.start;
    const newEnd = dto.end ?? clip.end;
    const updated =
      (await this.store.updateClip(auth.organizationId, clip.id, {
        start: newStart,
        end: newEnd,
      })) ?? { ...clip, start: newStart, end: newEnd };

    return {
      clipId: updated.id,
      jobId: updated.jobId,
      rank: updated.rank,
      start: updated.start,
      end: updated.end,
      hookLine: updated.hookLine,
      hookTitle: updated.hookTitle ?? null,
      viralityScore: updated.viralityScore,
      reason: updated.reason,
      suggestedTitle: updated.suggestedTitle,
      downloadUrl: await this.storage.signKey(updated.finalKey),
      thumbnailUrl: await this.storage.signKey(updated.thumbKey),
    };
  }

  /** Spawn pipeline/render_one.py and resolve on a clean exit (reject otherwise). */
  private runRenderOne(dto: RenderClipDto): Promise<void> {
    const args = ['pipeline/render_one.py', '--job-id', dto.jobId, '--rank', String(dto.rank)];
    if (dto.start !== undefined) args.push('--start', String(dto.start));
    if (dto.end !== undefined) args.push('--end', String(dto.end));
    if (dto.style) args.push('--style-json', JSON.stringify(dto.style));

    return new Promise((resolve, reject) => {
      const child = spawn(PYTHON_BIN, args, { cwd: REPO_ROOT });
      let stderrTail = '';
      child.stderr.setEncoding('utf-8');
      child.stderr.on('data', (c: string) => (stderrTail = (stderrTail + c).slice(-4000)));
      child.on('error', (e) => reject(new Error(`Failed to spawn render: ${e.message}`)));
      child.on('close', (code) => {
        if (code === 0) return resolve();
        this.logger.error(`render_one failed (${code}) for ${dto.jobId}#${dto.rank}:\n${stderrTail.trim()}`);
        reject(new BadRequestException('Re-render failed. Check the trim range and try again.'));
      });
    });
  }

  /**
   * GET /clips?jobId=... — list clips for the org (optionally one job), each
   * with time-limited signed URLs minted after the organization_id check.
   */
  @Get()
  async list(
    @CurrentOrg() auth: AuthContext,
    @Query('jobId') jobId?: string,
  ): Promise<{ clips: ClipView[] }> {
    const clips = await this.store.listClips(auth.organizationId, jobId);
    const views = await Promise.all(
      clips.map(async (c): Promise<ClipView> => ({
        clipId: c.id,
        jobId: c.jobId,
        rank: c.rank,
        start: c.start,
        end: c.end,
        hookLine: c.hookLine,
        hookTitle: c.hookTitle ?? null,
        viralityScore: c.viralityScore,
        reason: c.reason,
        suggestedTitle: c.suggestedTitle,
        downloadUrl: await this.storage.signKey(c.finalKey),
        thumbnailUrl: await this.storage.signKey(c.thumbKey),
      })),
    );
    return { clips: views };
  }
}
