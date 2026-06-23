import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';

/**
 * Serves locally produced clip artifacts (workspace/<jobId>/clips/<name>) over
 * HTTP. Only relevant in local-files mode (no R2); harmless otherwise - the
 * route simply 404s when files are absent.
 */
@Module({
  controllers: [FilesController],
})
export class FilesModule {}
