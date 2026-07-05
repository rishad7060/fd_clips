import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATA_STORE, DataStore } from '../persistence/store.types';
import { JoinWaitlistDto } from './dto/waitlist.dto';

/**
 * Public waitlist signups. Store-only (no email is sent) - the visitor's email
 * is persisted and surfaced in the admin dashboard. Idempotent on email so a
 * repeat submit is a friendly success, never an error.
 */
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  async join(dto: JoinWaitlistDto): Promise<{ ok: true; already: boolean }> {
    const { already } = await this.store.addWaitlistEntry({
      email: dto.email,
      name: dto.name ?? null,
      source: dto.source ?? null,
    });
    if (!already) {
      this.logger.log(`Waitlist signup: ${dto.email.trim().toLowerCase()}`);
    }
    return { ok: true, already };
  }
}
