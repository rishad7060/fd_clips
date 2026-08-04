import { BlogPostRecord } from '../persistence/store.types';

/** API view of a BlogPost (camelCase boundary), ISO date strings. */
export interface BlogPostView {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  bodyMarkdown: string;
  heroAlt: string;
  published: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Lighter listing view (no bodyMarkdown - keeps GET /blog light). */
export type BlogPostListView = Omit<BlogPostView, 'bodyMarkdown'>;

export function toBlogPostView(post: BlogPostRecord): BlogPostView {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    author: post.author,
    bodyMarkdown: post.bodyMarkdown,
    heroAlt: post.heroAlt,
    published: post.published,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function toBlogPostListView(post: BlogPostRecord): BlogPostListView {
  const { bodyMarkdown: _omit, ...rest } = toBlogPostView(post);
  return rest;
}
