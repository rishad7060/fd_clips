import { Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ClipRecord, PlanTier } from '../persistence/store.types';
import { capabilitiesFor } from '../billing/plans';

const logger = new Logger('ClipExpiry');

const MS_PER_DAY = 86_400_000;

// Mirrors files.controller.ts JOB_ID_RE: word chars / digits / underscore /
// dash only. Guards the swept path against traversal.
const JOB_ID_RE = /^[\w-]+$/;

/** Computed expiry facts for a clip (never stored - derived on read). */
export interface ClipExpiry {
  /** ISO timestamp the clip's files are deleted; null = kept indefinitely. */
  expiresAt: string | null;
  /** True once the retention window has passed. */
  expired: boolean;
}

/**
 * Compute a clip's expiry from its createdAt + the org's CURRENT plan retention
 * window (capabilitiesFor(tier).clipRetentionDays). We compute on read rather
 * than storing a column so no Prisma migration is needed and the value always
 * reflects the org's live plan (e.g. an upgrade extends retention immediately).
 *
 * A null retention (should not happen now that all tiers set a number, but kept
 * for safety) means "never expires".
 */
export function computeClipExpiry(clip: ClipRecord, plan: PlanTier): ClipExpiry {
  const days = capabilitiesFor(plan).clipRetentionDays;
  if (days == null) return { expiresAt: null, expired: false };
  const created = Date.parse(clip.createdAt);
  if (Number.isNaN(created)) return { expiresAt: null, expired: false };
  const expiresMs = created + days * MS_PER_DAY;
  return {
    expiresAt: new Date(expiresMs).toISOString(),
    expired: Date.now() >= expiresMs,
  };
}

/**
 * Lazy on-read sweep: delete the on-disk deliverables for expired clips of a
 * single job. Called from ClipsController.list AFTER the org check, so it only
 * ever touches workspace/<jobId>/clips for a job the caller owns.
 *
 * Only runs when at least one clip in the group is expired, and only deletes the
 * files that belong to expired clips (never a non-expired clip's files). The
 * <jobId> is validated against JOB_ID_RE and the resolved path is confirmed to
 * live under workspace/<jobId>/clips/ before any unlink, mirroring the traversal
 * guard in files.controller.ts.
 */
export function sweepExpiredClipFiles(
  repoRoot: string,
  jobId: string,
  expiredClips: ClipRecord[],
): void {
  if (expiredClips.length === 0) return;
  if (!JOB_ID_RE.test(jobId)) {
    logger.warn(`Refusing to sweep clips for invalid jobId: ${jobId}`);
    return;
  }

  const clipsDir = path.resolve(repoRoot, 'workspace', jobId, 'clips');
  if (!fs.existsSync(clipsDir)) return;

  let deleted = 0;
  for (const clip of expiredClips) {
    // Deliverables the pipeline writes per clip: <rank>_final.mp4 + <rank>_thumb.jpg.
    for (const name of [`${clip.rank}_final.mp4`, `${clip.rank}_thumb.jpg`]) {
      const filePath = path.resolve(clipsDir, name);
      // Traversal guard: the resolved path MUST live directly under clipsDir.
      if (filePath !== path.join(clipsDir, name)) continue;
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted++;
          logger.log(`Deleted expired clip file: ${jobId}/clips/${name}`);
        }
      } catch (e) {
        logger.warn(`Failed to delete ${filePath}: ${(e as Error).message}`);
      }
    }
  }
  if (deleted > 0) {
    logger.log(`Swept ${deleted} expired clip file(s) for job ${jobId}.`);
  }
}
