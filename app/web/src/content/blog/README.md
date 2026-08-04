# Blog post content files

Each file in this directory is named `<slug>.tsx` and matches a `slug` in
`src/lib/blog.ts` (`BLOG_POSTS`). It exports a **default React component** with
no props that renders the post body.

To fill in a real post:

1. Open `src/content/blog/<slug>.tsx`.
2. Replace the placeholder JSX with the real article, wrapped in the same
   root `<div className="blog-prose">...</div>` element - that class (defined
   in `src/app/globals.css`) styles `h2`/`h3`/`p`/`ul`/`ol`/`blockquote`/`code`/
   `table`/`a`/`strong` automatically, so plain semantic HTML tags are enough.
3. Wrap any `<table>` in `<div className="overflow-x-auto">` (see the `.legal-
   prose`/compare-table pattern) so wide tables scroll instead of breaking
   mobile layout.
4. Update the matching entry in `src/lib/blog.ts` (description, excerpt,
   readingMinutes, updatedAt, tags) if the real content changes those facts.
5. Optionally drop a hero image at `public/blog/<slug>.webp` (1600x900 or
   16:9) - the post page uses it automatically when present and otherwise
   falls back to a gradient placeholder, so this step is optional.

No new dependencies, no MDX pipeline - it's plain TSX so you get full
TypeScript + design-system component access (Button, Card, etc.) in post
bodies if needed.
