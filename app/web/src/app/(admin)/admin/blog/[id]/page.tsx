"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import type { AdminBlogPost } from "@/lib/adminTypes";
import { Skeleton } from "@/components/ui/shadcn/skeleton";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getBlogPost(params.id)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (notFound) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">Post not found.</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => router.push("/admin/blog")}
        >
          Back to blog
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <BlogPostForm post={post} />;
}
