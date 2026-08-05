import type { Metadata } from "next";

/**
 * Shared metadata builder so every SEO/marketing page emits a consistent,
 * correctly-canonicalized shape (title, description, keywords, canonical,
 * OpenGraph, Twitter) instead of hand-copying the same object per page.
 *
 * `path` is the site-relative canonical (e.g. "/best-ai-video-clipper"). The
 * root layout sets `metadataBase` from NEXT_PUBLIC_SITE_URL, so relative
 * canonical/OG URLs resolve to absolute prod URLs automatically.
 *
 * The page's own <title> gets the "%s | ClipsHQ" template from the root layout;
 * the OG/Twitter titles here append "| ClipsHQ" explicitly since OG titles are
 * not run through the template.
 */
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** Absolute or site-relative OG image; defaults to the site OG image. */
  ogImage?: string;
}): Metadata {
  const { title, description, path, keywords, ogImage } = opts;
  const ogTitle = `${title} | ClipsHQ`;
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      url: path,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
