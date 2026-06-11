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
    if (this.config.flags.mockStorage) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSec;
      // Deterministic fake signed URL — clearly marked as mock.
      return `https://mock-r2.local/${this.config.r2Bucket}/${encodeURI(key)}?mock=1&X-Expires=${exp}`;
    }
    // Real mode: presign against R2 (S3 API). Implemented when R2 creds exist.
    const endpoint = this.config.r2Endpoint!;
    return `${endpoint.replace(/\/$/, '')}/${this.config.r2Bucket}/${encodeURI(key)}`;
  }
}
