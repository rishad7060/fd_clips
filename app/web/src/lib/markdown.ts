import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Server-side Markdown -> sanitized HTML for blog post bodies (DB-backed
 * `bodyMarkdown`). Runs in the (blog) SSR pages only - never in the browser -
 * so it's safe to trust `marked`'s output only after passing it through the
 * `sanitize-html` allowlist below (admin-authored content still goes through
 * a public site, so we don't trust it blindly).
 *
 * GFM (tables, autolinking, line breaks off - standard Markdown paragraphs)
 * is enabled via `gfm: true`; `breaks: false` matches typical long-form post
 * writing (blank line = new paragraph).
 */
marked.setOptions({ gfm: true, breaks: false });

/** Tags the sanitized blog body may contain - mirrors what `.blog-prose` styles. */
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "br",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel"],
};

/**
 * Render trusted-ish Markdown (admin-authored) to sanitized HTML for public
 * SSR output. Strips anything not in the allowlist - no script/style/iframe,
 * no inline event handlers, no arbitrary attributes.
 */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md ?? "", { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Force safe rel/target on any link the author included.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, false),
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}

/** ~200 wpm reading time, derived from the raw markdown word count. */
export function readingMinutes(md: string): number {
  const words = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
