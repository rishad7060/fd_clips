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
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppAuthGuard } from '../auth/auth.guard';
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

/** One transcript word, re-based to CLIP-RELATIVE seconds. */
interface WordView {
  word: string;
  start: number;
  end: number;
}

/** Per-clip transcript words (clip-relative), camelCase boundary like ClipView. */
interface ClipTranscriptView {
  clipId: string;
  jobId: string;
  rank: number;
  clipStart: number;
  clipEnd: number;
  words: WordView[];
}

@UseGuards(AppAuthGuard)
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
    if (dto.captions && dto.captions.length > 0) {
      args.push('--captions-json', JSON.stringify(dto.captions));
    }

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

  /**
   * GET /clips/transcript?jobId=...&rank=... — per-word transcript for ONE clip,
   * sliced to [clip.start, clip.end] and re-based to clip-relative seconds (the
   * same scale as the pre-cut n_final.mp4's currentTime). Feeds the editor's
   * karaoke subtitle layer.
   *
   * Org scope comes from listClips (tenant-scoped by organizationId). When the
   * transcript file is absent OR the real pipeline is off, returns a synthesized
   * mock track so offline/dev mode always has a non-empty karaoke layer — never
   * 500s.
   */
  @Get('transcript')
  async transcript(
    @CurrentOrg() auth: AuthContext,
    @Query('jobId') jobId: string,
    @Query('rank') rankRaw: string,
  ): Promise<ClipTranscriptView> {
    const rank = Number(rankRaw);
    if (Number.isNaN(rank)) {
      throw new BadRequestException('rank must be a number');
    }

    // Tenant scope: listClips is already org-scoped, so finding the clip here
    // doubles as the authorization check.
    const clips = await this.store.listClips(auth.organizationId, jobId);
    const clip = clips.find((c) => c.rank === rank);
    if (!clip) {
      throw new NotFoundException(`Clip #${rank} not found for job ${jobId}`);
    }

    const clipEnd = +(clip.end - clip.start).toFixed(3);

    const mockFallback = (): ClipTranscriptView => {
      const text = [clip.hookLine, clip.suggestedTitle].filter(Boolean).join(' ');
      const toks = text.split(/\s+/).filter(Boolean);
      const dur = Math.max(0.2, clip.end - clip.start);
      const per = dur / Math.max(1, toks.length);
      const words: WordView[] = toks.map((t, i) => ({
        word: t,
        start: +(i * per).toFixed(3),
        end: +((i + 1) * per).toFixed(3),
      }));
      return { clipId: clip.id, jobId: clip.jobId, rank: clip.rank, clipStart: 0, clipEnd, words };
    };

    // Read the source transcript when the real pipeline is on and the file
    // exists; otherwise synthesize so dev mode still works.
    const ws = path.resolve(REPO_ROOT, 'workspace', jobId);
    const file = path.join(ws, 'transcript.json');
    const raw =
      process.env.USE_REAL_PIPELINE === 'true' && fs.existsSync(file)
        ? fs.readFileSync(file, 'utf-8')
        : null;
    if (!raw) return mockFallback();

    try {
      const data = JSON.parse(raw) as {
        segments?: { words?: { word: string; start: number; end: number }[] }[];
      };
      const words: WordView[] = [];
      for (const seg of data.segments ?? []) {
        for (const w of seg.words ?? []) {
          // Keep only words fully contained in the clip range, then rebase.
          if (w.start >= clip.start && w.end <= clip.end) {
            words.push({
              word: w.word,
              start: +(w.start - clip.start).toFixed(3),
              end: +(w.end - clip.start).toFixed(3),
            });
          }
        }
      }
      return { clipId: clip.id, jobId: clip.jobId, rank: clip.rank, clipStart: 0, clipEnd, words };
    } catch (e) {
      this.logger.warn(
        `transcript.json parse failed for ${jobId}#${rank}; using mock fallback: ${
          (e as Error).message
        }`,
      );
      return mockFallback();
    }
  }
}
