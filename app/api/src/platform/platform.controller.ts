import { Controller, Get, Inject } from '@nestjs/common';
import { DataStore, DATA_STORE } from '../persistence/store.types';

/**
 * Public, unauthenticated view of the platform controls. The web app polls this
 * (no admin token required) to render the maintenance gate and the global
 * announcement banner. Only operator-broadcast fields are exposed here - the
 * internal toggles (new-jobs/signups gating) are enforced server-side and are
 * not part of this payload.
 */
@Controller('platform')
export class PlatformController {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  @Get('status')
  async status() {
    const s = await this.store.getPlatformSettings();
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      announcement: s.announcement,
      signupsEnabled: s.signupsEnabled,
      updatedAt: s.updatedAt,
    };
  }
}
