import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { Response } from 'express';

/**
 * Streams locally produced clip artifacts to the browser.
 *
 * In local-files mode (no R2) the pipeline writes deliverables to
 *   workspace/<jobId>/clips/<name>            (e.g. 1_final.mp4)
 * and StorageService.signKey() mints `${API_PUBLIC_URL}/files/<jobId>/<name>`.
 *
 * This controller resolves that path, validates the segments against path
 * traversal, sets the right content-type and supports HTTP range requests so
 * the <video> element can seek.
 */
@Controller('files')
export class FilesController {
  /** Allowed file extensions and their content types. */
  private static readonly CONTENT_TYPES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.jpg': 'image/jpeg',
  };

  // <jobId>: word chars / digits / underscore / dash only.
  private static readonly JOB_ID_RE = /^[\w-]+$/;
  // <name>: word chars / digits / underscore / dot, ending in an allowed ext.
  private static readonly NAME_RE = /^[\w.]+\.(mp4|jpg)$/;

  /** Repo-root workspace dir. Server is started from C:/Projects/Opus_clip_clone. */
  private readonly workspaceRoot = resolve(process.cwd(), 'workspace');

  @Get(':jobId/:name')
  stream(
    @Param('jobId') jobId: string,
    @Param('name') name: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): void {
    if (!FilesController.JOB_ID_RE.test(jobId)) {
      throw new BadRequestException('Invalid jobId');
    }
    if (!FilesController.NAME_RE.test(name)) {
      throw new BadRequestException('Invalid file name');
    }

    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    const contentType = FilesController.CONTENT_TYPES[ext];
    if (!contentType) {
      throw new BadRequestException('Unsupported file type');
    }

    // Resolve and guard against path traversal: the final path MUST live
    // under workspace/<jobId>/clips/.
    const clipsDir = join(this.workspaceRoot, jobId, 'clips');
    const filePath = resolve(clipsDir, name);
    const normalizedDir = resolve(clipsDir);
    if (filePath !== join(normalizedDir, name)) {
      throw new BadRequestException('Invalid path');
    }
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const stat = statSync(filePath);
    if (!stat.isFile()) {
      throw new NotFoundException('File not found');
    }
    const fileSize = stat.size;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');

    // Range request — stream a partial body so the player can seek.
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const startStr = match[1];
      const endStr = match[2];
      let start = startStr === '' ? 0 : parseInt(startStr, 10);
      let end = endStr === '' ? fileSize - 1 : parseInt(endStr, 10);

      if (startStr === '' && endStr !== '') {
        // Suffix range: last N bytes.
        start = Math.max(fileSize - parseInt(endStr, 10), 0);
        end = fileSize - 1;
      }

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      end = Math.min(end, fileSize - 1);

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', fileSize);
    createReadStream(filePath).pipe(res);
  }
}
