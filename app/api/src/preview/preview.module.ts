import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PreviewController } from './preview.controller';

/**
 * Lightweight video-preview endpoint (POST /preview). Spawns pipeline/preview.py
 * to fetch title/thumbnail/resolution for a URL WITHOUT downloading the video,
 * so the config screen can show a preview card. AppConfigService is @Global, so
 * only AuthModule (the Clerk guard) needs importing.
 */
@Module({
  imports: [AuthModule],
  controllers: [PreviewController],
})
export class PreviewModule {}
