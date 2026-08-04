# Blog posts are now DB-managed

This directory used to hold hardcoded `<slug>.tsx` body files for each post.
The blog is now backed by the API's database and rendered server-side:

- Posts are created/edited/published from **`/admin/blog`** (see
  `src/app/(admin)/admin/blog/`), which calls `POST/PATCH/DELETE
  /admin/blog/*` on the API.
- The public `/blog` hub and `/blog/<slug>` pages fetch published posts from
  the API (`GET /blog`, `GET /blog/:slug`) in `src/app/(blog)/blog/*` - see
  `src/lib/blog.ts` for the fetch helpers.
- A post's body is authored as **Markdown** (`bodyMarkdown`) in the admin
  editor. It is rendered server-side via `src/lib/markdown.ts`
  (`marked` -> `sanitize-html`, allowlisted tags only) into the same
  `.blog-prose` styling (`src/app/globals.css`) these old TSX files used.

No content was lost - the original 5 posts were migrated into the database by
the API team's seed data. There is nothing to wire up here anymore; this
folder is kept only for this note.
