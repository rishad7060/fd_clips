import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext } from '../auth/auth.types';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { StorageService } from '../storage/storage.service';

/** API view of a Clip with signed (never raw) URLs. CONTRACTS.md §3/§5. */
interface ClipView {
  clipId: string;
  jobId: string;
  rank: number;
  start: number;
  end: number;
  hookLine: string;
  viralityScore: number;
  reason: string;
  suggestedTitle: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
}

@UseGuards(ClerkAuthGuard)
@Controller('clips')
export class ClipsController {
  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly storage: StorageService,
  ) {}

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
