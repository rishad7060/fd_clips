import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';

/**
 * Public platform-status endpoint. The DataStore comes from the @Global
 * PersistenceModule, so no imports are needed here.
 */
@Module({
  controllers: [PlatformController],
})
export class PlatformModule {}
