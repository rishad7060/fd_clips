import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

/**
 * Mints time-limited signed URLs for R2 object keys (CONTRACTS.md §5). The web
 * app only ever receives signed URLs, never raw keys.
 *
 * MOCK_STORAGE: returns deterministic fake URLs (no R2 creds needed). Real
 * mode would use the S3 presigner against R2_ENDPOINT; the signature of this
 * method is identical so the real impl drops in.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: AppConfigService) {}

  /** @param expiresInSec default 1 hour. */
  async signKey(key: string | null | undefined, expiresInSec = 3600): Promise<string | null> {
    if (!key) return null;

    // Local-files mode: clips live on local disk under workspace/<job>/clips/<name>
    // and are streamed by the /files controller. Build a browser-reachable URL
    // from the R2-style key '<org>/<job>/clips/<name>'.
    if (this.config.flags.localFiles) {
      const local = this.toLocalFilesUrl(key);
      if (local) return local;
      // Fall through to mock/real behaviour for keys that aren't clip files.
    }

    if (this.config.flags.mockStorage) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSec;
      // Deterministic fake signed URL — clearly marked as mock.
      return `https://mock-r2.local/${this.config.r2Bucket}/${encodeURI(key)}?mock=1&X-Expires=${exp}`;
    }
    // Real mode: presign against R2 (S3 API). Implemented when R2 creds exist.
    const endpoint = this.config.r2Endpoint!;
    return `${endpoint.replace(/\/$/, '')}/${this.config.r2Bucket}/${encodeURI(key)}`;
  }

  /**
   * Maps an R2-style clip key '<org>/<job>/clips/<name>' to a browser-reachable
   * URL served by the local /files controller:
   *   `${apiPublicUrl}/files/<job>/<name>`
   * Returns null for keys that don't look like a clip-file key (so the caller
   * can fall back to the mock/real-R2 branch).
   */
  private toLocalFilesUrl(key: string): string | null {
    const parts = key.split('/');
    const idx = parts.indexOf('clips');
    // Expect at least '<job>/clips/<name>' (org prefix is optional).
    if (idx < 1 || idx + 1 >= parts.length) return null;
    const jobId = parts[idx - 1];
    const name = parts.slice(idx + 1).join('/');
    if (!jobId || !name) return null;
    return `${this.config.apiPublicUrl}/files/${encodeURIComponent(jobId)}/${encodeURIComponent(name)}`;
  }
}
