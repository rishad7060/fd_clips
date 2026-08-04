"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { AdminBlogPost, BlogCategory, BlogPostInput } from "@/lib/adminTypes";
import { renderMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./ConfirmDialog";

const CATEGORIES: BlogCategory[] = ["Comparisons", "Guides", "Tools", "Playbooks", "Company"];

/** On/off pill toggle - mirrors EditPlanDialog's Toggle so admin forms stay consistent. */
function Toggle({
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, label: onLabel },
        { v: false, label: offLabel },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === o.v
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create/edit form for a DB-backed blog post. Used by both
 * /admin/blog/new (no `post` prop) and /admin/blog/[id] (with `post`).
 * The Markdown body textarea renders a live preview via the SAME
 * renderMarkdown() the public SSR pages use, so what the admin sees here is
 * what ends up in .blog-prose on the live site (minus server-side
 * sanitization differences - admin input is trusted here).
 */
export function BlogPostForm({ post }: { post?: AdminBlogPost }) {
  const router = useRouter();
  const isEdit = !!post;

  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [title, setTitle] = useState(post?.title ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [category, setCategory] = useState<BlogCategory>(post?.category ?? "Guides");
  const [tagsInput, setTagsInput] = useState((post?.tags ?? []).join(", "));
  const [author, setAuthor] = useState(post?.author ?? "ClipsHQ Team");
  const [heroAlt, setHeroAlt] = useState(post?.heroAlt ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [body, setBody] = useState(post?.bodyMarkdown ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const previewHtml = useMemo(() => renderMarkdown(body), [body]);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function save() {
    setError(null);
    if (!slug.trim() || !title.trim() || !body.trim()) {
      setError("Slug, title, and body are required.");
      return;
    }
    setBusy(true);
    try {
      const input: BlogPostInput = {
        slug: slugify(slug),
        title: title.trim(),
        description: description.trim(),
        excerpt: excerpt.trim(),
        category,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        author: author.trim() || "ClipsHQ Team",
        bodyMarkdown: body,
        heroAlt: heroAlt.trim(),
        published,
      };
      if (isEdit && post) {
        await adminApi.updateBlogPost(post.id, input);
      } else {
        await adminApi.createBlogPost(input);
      }
      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? "Edit post" : "New post"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Editing "${post!.title}"` : "Drafts stay hidden from /blog until published."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit ? (
            <Button variant="outline" onClick={() => setDeleteOpen(true)} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : null}
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save post
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger-300/30 bg-danger-300/10 px-4 py-2.5 text-sm text-danger-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as BlogCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author">Author</Label>
          <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="description">Description (meta / SEO, ~150-160 chars)</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="excerpt">Excerpt (hub-card teaser)</Label>
          <Textarea id="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ai shorts tools, comparisons"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heroAlt">Hero image alt text</Label>
          <Input id="heroAlt" value={heroAlt} onChange={(e) => setHeroAlt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Published</Label>
          <Toggle value={published} onChange={setPublished} onLabel="Published" offLabel="Draft" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="body">Body (Markdown - GFM: tables, lists, links, headings, bold, blockquote, code)</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            className="font-mono text-xs leading-relaxed"
            placeholder={"## A heading\n\nA paragraph with **bold** text and a [link](/blog).\n\n- bullet one\n- bullet two"}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Live preview</Label>
          <div className="max-h-[560px] overflow-y-auto rounded-md border border-border bg-background/40 p-4">
            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>

      {isEdit && post ? (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Delete "${post.title}"?`}
          description="This permanently removes the post. This cannot be undone."
          confirmLabel="Delete post"
          destructive
          onConfirm={async () => {
            await adminApi.deleteBlogPost(post.id);
            router.push("/admin/blog");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
