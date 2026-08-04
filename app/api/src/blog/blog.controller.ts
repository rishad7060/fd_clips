import { Controller, Get, Param } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogPostListView, BlogPostView, toBlogPostListView, toBlogPostView } from './blog.mapper';

/**
 * Public (unauthenticated) ClipsHQ blog endpoints. Published posts only - see
 * AdminBlogController for the draft-inclusive admin CRUD API.
 */
@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  /** GET /blog - published posts, newest first. Light view (no bodyMarkdown). */
  @Get()
  async list(): Promise<{ posts: BlogPostListView[] }> {
    const rows = await this.blog.listPublished();
    return { posts: rows.map(toBlogPostListView) };
  }

  /** GET /blog/:slug - a single published post, including bodyMarkdown. 404 if missing/unpublished. */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string): Promise<BlogPostView> {
    const post = await this.blog.getPublishedBySlug(slug);
    return toBlogPostView(post);
  }
}
