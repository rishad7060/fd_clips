"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, ExternalLink, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminBlogPost } from "@/lib/adminTypes";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";

export function BlogRowActions({
  post,
  onChanged,
}: {
  post: AdminBlogPost;
  onChanged: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Post actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/blog/${post.id}`}>
              <Pencil className="h-4 w-4" /> Edit post
            </Link>
          </DropdownMenuItem>
          {post.published ? (
            <DropdownMenuItem asChild>
              <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> View live
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-300 focus:text-danger-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${post.title}"?`}
        description="This permanently removes the post. This cannot be undone."
        confirmLabel="Delete post"
        destructive
        onConfirm={async () => {
          await adminApi.deleteBlogPost(post.id);
          onChanged();
        }}
      />
    </>
  );
}
