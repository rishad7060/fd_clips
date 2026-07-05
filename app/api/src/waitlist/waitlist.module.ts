import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

/**
 * Public waitlist signups. The DataStore comes from the @Global
 * PersistenceModule, so no imports are needed here.
 */
@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
