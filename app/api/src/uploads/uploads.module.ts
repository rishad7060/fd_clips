import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';

/**
 * Local-video upload endpoint (POST /uploads). Persists the multipart file
 * under the pipeline workspace and returns a workspace-relative sourceKey the
 * job-create flow can use with sourceType="upload".
 */
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
