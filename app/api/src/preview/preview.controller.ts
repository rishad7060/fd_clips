import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AppConfigService } from '../config/config.service';
import { PreviewDto } from './dto/preview.dto';

// Repo root: pipeline/preview.py resolves relative to here.
// This file is app/api/src/preview/preview.controller.ts → up 4 to the repo root.
const REPO_ROOT =
  process.env.PIPELINE_REPO_ROOT ||
  path.resolve(__dirname, '..', '..', '..', '..');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';

/** Raw JSON line printed by pipeline/preview.py. */
interface PreviewPy {
  title?: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Lightweight video preview (camelCase boundary). qualityLabel is derived from
 * the best available height (4K/1080p/720p/360p) so the UI can show a resolution
 * badge like Opus's "4K". `note` carries a soft, non-fatal message when we fell
 * back to a stub (so the UI can show a hint without treating it as an error).
 */
interface PreviewView {
  title: string;
  thumbnailUrl: string;
  durationSec: number;
  width: number;
  height: number;
  qualityLabel: string;
  note?: string;
}

/** Deterministic stub used in mock mode / when python is unavailable. */
const STUB: PreviewView = {
  title: 'Preview',
  thumbnailUrl: '',
  durationSec: 525,
  width: 1920,
  height: 1080,
  qualityLabel: '1080p',
};

/** Map a video height to a friendly resolution badge. */
function qualityLabel(height: number): string {
  if (height >= 2160) return '4K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 360) return '360p';
  if (height > 0) return `${height}p`;
  return '—';
}

@UseGuards(ClerkAuthGuard)
@Controller('preview')
export class PreviewController {
  private readonly logger = new Logger(PreviewController.name);

  constructor(private readonly config: AppConfigService) {}

  /**
   * POST /preview — fetch title/thumbnail/resolution for a URL WITHOUT
   * downloading. In mock mode (or when python/yt-dlp is unavailable, or the
   * extract fails) returns a deterministic stub with a `note` so the UI always
   * has something and never breaks. Never 500s.
   */
  @Post()
  @HttpCode(200)
  async preview(@Body() dto: PreviewDto): Promise<PreviewView> {
    if (this.config.flags.mockMode) {
      return { ...STUB, note: 'Mock preview (no metadata fetched).' };
    }

    let py: PreviewPy;
    try {
      py = await this.runPreviewPy(dto.url);
    } catch (e) {
      // python missing / spawn failure / timeout → soft stub, never a 500.
      this.logger.warn(`preview.py unavailable for ${dto.url}: ${(e as Error).message}`);
      return { ...STUB, note: 'Preview unavailable; showing defaults.' };
    }

    if (py.error || (!py.width && !py.height && !py.title)) {
      // Bad/private URL or empty extract — soft stub with a hint, still 200.
      const note = py.error
        ? 'Could not read this video (it may be private or unsupported).'
        : 'No preview available for this URL.';
      return { ...STUB, note };
    }

    const height = Number(py.height) || 0;
    return {
      title: py.title || 'Preview',
      thumbnailUrl: py.thumbnail || '',
      durationSec: Number(py.duration) || 0,
      width: Number(py.width) || 0,
      height,
      qualityLabel: qualityLabel(height),
    };
  }

  /**
   * Spawn pipeline/preview.py --url <url> and parse its single JSON stdout line.
   * preview.py always exits 0 and prints clean JSON (even on error), so we only
   * reject on a real spawn failure or unparseable output.
   */
  private runPreviewPy(url: string): Promise<PreviewPy> {
    const args = ['pipeline/preview.py', '--url', url];
    return new Promise((resolve, reject) => {
      const child = spawn(PYTHON_BIN, args, { cwd: REPO_ROOT });
      let stdout = '';
      let stderrTail = '';
      let settled = false;

      // Bound the wait so a hung yt-dlp extract can't pin a request open.
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(new Error('preview.py timed out'));
      }, 25_000);

      child.stdout.setEncoding('utf-8');
      child.stdout.on('data', (c: string) => (stdout += c));
      child.stderr.setEncoding('utf-8');
      child.stderr.on('data', (c: string) => (stderrTail = (stderrTail + c).slice(-2000)));

      child.on('error', (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to spawn preview: ${e.message}`));
      });

      child.on('close', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // Take the last non-empty line so any stray output before the JSON is ignored.
        const line = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .pop();
        if (!line) {
          if (stderrTail.trim()) this.logger.warn(`preview.py stderr: ${stderrTail.trim()}`);
          return reject(new Error('preview.py produced no output'));
        }
        try {
          resolve(JSON.parse(line) as PreviewPy);
        } catch (e) {
          reject(new Error(`preview.py bad JSON: ${(e as Error).message}`));
        }
      });
    });
  }
}
