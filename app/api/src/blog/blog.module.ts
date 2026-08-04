import { Module } from '@nestjs/common';
import { AdminBlogController } from './admin-blog.controller';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

/**
 * ClipsHQ marketing blog. DATA_STORE and the AdminGuard (via AppConfigService
 * + AppAuthService) come from @Global modules, so this module only needs to
 * declare its own controllers + service.
 */
@Module({
  controllers: [BlogController, AdminBlogController],
  providers: [BlogService],
})
export class BlogModule {}
