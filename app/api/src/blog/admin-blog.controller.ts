import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { BlogService } from './blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog.dto';
import { BlogPostView, toBlogPostView } from './blog.mapper';

/**
 * Admin CRUD for the ClipsHQ blog (drafts included). Gated by AdminGuard,
 * mirroring AdminController's pattern. Kept as a dedicated controller (rather
 * than folded into AdminController) since the blog has its own DTOs/mapper.
 */
@Controller('admin/blog')
@UseGuards(AdminGuard)
export class AdminBlogController {
  constructor(private readonly blog: BlogService) {}

  /** GET /admin/blog - all posts, incl. unpublished/drafts. */
  @Get()
  async list(): Promise<{ posts: BlogPostView[] }> {
    const rows = await this.blog.listAll();
    return { posts: rows.map(toBlogPostView) };
  }

  /** GET /admin/blog/:id - one post, incl. bodyMarkdown. */
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<BlogPostView> {
    const post = await this.blog.getById(id);
    return toBlogPostView(post);
  }

  @Post()
  async create(@Body() dto: CreateBlogPostDto): Promise<BlogPostView> {
    const post = await this.blog.create(dto);
    return toBlogPostView(post);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto): Promise<BlogPostView> {
    const post = await this.blog.update(id, dto);
    return toBlogPostView(post);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.blog.delete(id);
  }
}
