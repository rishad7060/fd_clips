import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostPatch, BlogPostRecord, DATA_STORE, DataStore } from '../persistence/store.types';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog.dto';

/**
 * ClipsHQ marketing blog. Public reads are published-only; admin reads/writes
 * see everything (drafts included). Not tenant-scoped - a global content
 * record, like Plan/Waitlist. Slug uniqueness is enforced here (surfaced as a
 * 409) on top of the store's own conflict guard.
 */
@Injectable()
export class BlogService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  // ── Public ────────────────────────────────────────────────────────────────

  listPublished(): Promise<BlogPostRecord[]> {
    return this.store.listBlogPosts({ publishedOnly: true });
  }

  async getPublishedBySlug(slug: string): Promise<BlogPostRecord> {
    const post = await this.store.getBlogPostBySlug(slug);
    if (!post || !post.published) throw new NotFoundException('Blog post not found');
    return post;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  listAll(): Promise<BlogPostRecord[]> {
    return this.store.listBlogPosts();
  }

  async getById(id: string): Promise<BlogPostRecord> {
    const post = await this.store.getBlogPost(id);
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(dto: CreateBlogPostDto): Promise<BlogPostRecord> {
    const clash = await this.store.getBlogPostBySlug(dto.slug);
    if (clash) throw new ConflictException(`Slug already in use: ${dto.slug}`);
    try {
      return await this.store.createBlogPost({
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        excerpt: dto.excerpt,
        category: dto.category,
        tags: dto.tags,
        author: dto.author,
        bodyMarkdown: dto.bodyMarkdown,
        heroAlt: dto.heroAlt,
        published: dto.published,
        publishedAt: dto.publishedAt,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  async update(id: string, dto: UpdateBlogPostDto): Promise<BlogPostRecord> {
    await this.getById(id); // 404 if missing
    if (dto.slug) {
      const clash = await this.store.getBlogPostBySlug(dto.slug);
      if (clash && clash.id !== id) throw new ConflictException(`Slug already in use: ${dto.slug}`);
    }
    const patch: BlogPostPatch = { ...dto };
    try {
      return await this.store.updateBlogPost(id, patch);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  async delete(id: string): Promise<{ deleted: true }> {
    await this.getById(id); // 404 if missing
    await this.store.deleteBlogPost(id);
    return { deleted: true };
  }
}
