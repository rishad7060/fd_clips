import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'fs/promises';
import { extname, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

/**
 * Minimal shape of a multer-parsed upload. We declare it locally instead of
 * depending on @types/multer (not installed) so the build needs no new dep.
 * FileInterceptor's default memory storage fills `buffer`.
 */
interface UploadedMulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Accepted upload extensions → kept so the pipeline can ingest the file. */
const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi']);
/** Hard cap so a huge upload can't exhaust memory (multer buffers in RAM). */
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GiB

/**
 * Local-video upload endpoint.
 *
 * The web client POSTs a multipart form (field "file"); we persist the bytes
 * under the pipeline workspace and return a workspace-relative `sourceKey`. The
 * caller then creates a job with { sourceType: "upload", sourceKey }. The worker
 * spawns pipeline/run.py with this path as the source; ingest.py treats a
 * non-URL path as a local file (workspace-relative resolves against the repo
 * root, the worker's spawn cwd).
 */
@UseGuards(ClerkAuthGuard)
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  /**
   * Repo root, where pipeline/run.py resolves workspace/. Prefer
   * PIPELINE_REPO_ROOT (set by start-real.ps1), else climb from dist/uploads/
   * up to the repo root. Matches files.controller.ts / real-pipeline.worker.ts.
   */
  private readonly repoRoot = resolve(
    process.env.PIPELINE_REPO_ROOT || resolve(__dirname, '..', '..', '..', '..'),
  );

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @UploadedFile() file: UploadedMulterFile | undefined,
  ): Promise<{ sourceKey: string }> {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('No file uploaded (expected multipart field "file").');
    }
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      throw new BadRequestException(
        `Unsupported file type "${ext || file.originalname}". Allowed: ${[...ALLOWED_EXTS].join(', ')}`,
      );
    }

    // Store under workspace/uploads/<uuid>/source<ext>; return a workspace-
    // relative path so it resolves against the worker's spawn cwd (repo root).
    const id = randomUUID();
    const relDir = `workspace/uploads/${id}`;
    const fileName = `source${ext}`;
    const absDir = resolve(this.repoRoot, relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(resolve(absDir, fileName), file.buffer);

    const sourceKey = `${relDir}/${fileName}`;
    this.logger.log(`Stored upload ${file.originalname} (${file.size} bytes) → ${sourceKey}`);
    return { sourceKey };
  }
}
