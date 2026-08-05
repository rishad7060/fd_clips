/**
 * Single source of truth for the comparison / alternatives SEO pages
 * (high-intent "vs" and "best/cheapest" searches). Consumed by the /compare
 * hub, each comparison page's cross-links, and the sitemap, so a new page is
 * added in exactly one place.
 *
 * Strategy: target bottom-of-funnel queries where the searcher is already
 * evaluating tools ("clipshq vs opus clip", "opus clip alternative", "cheapest
 * ai clip generator") and frame ClipsHQ as the value/simplicity choice.
 */
export interface CompareDef {
  slug: string;
  /** Hub short label. */
  label: string;
  /** H1 / hub-card title. */
  title: string;
  /** One-line hub-card + meta description lead. */
  blurb: string;
}

export const COMPARE_PAGES: CompareDef[] = [
  {
    slug: "clipshq-vs-opus-clip",
    label: "ClipsHQ vs Opus Clip",
    title: "ClipsHQ vs Opus Clip",
    blurb:
      "A fair, side-by-side look at pricing, captions and workflow - and where ClipsHQ is the simpler, cheaper pick.",
  },
  {
    slug: "clipshq-vs-vizard",
    label: "ClipsHQ vs Vizard",
    title: "ClipsHQ vs Vizard",
    blurb:
      "How ClipsHQ's minute-based pricing and hands-off email delivery compare to Vizard's credit model.",
  },
  {
    slug: "clipshq-vs-submagic",
    label: "ClipsHQ vs Submagic",
    title: "ClipsHQ vs Submagic",
    blurb:
      "Captions, clip generation and price compared - and why multilingual creators lean ClipsHQ.",
  },
  {
    slug: "clipshq-vs-klap",
    label: "ClipsHQ vs Klap",
    title: "ClipsHQ vs Klap",
    blurb:
      "Pricing, captions and workflow compared - and why multilingual creators tend to pick ClipsHQ.",
  },
  {
    slug: "clipshq-vs-munch",
    label: "ClipsHQ vs Munch",
    title: "ClipsHQ vs Munch",
    blurb:
      "How ClipsHQ's simple minute-based pricing compares to Munch's analytics-heavy, enterprise angle.",
  },
  {
    slug: "clipshq-vs-vidyo-ai",
    label: "ClipsHQ vs vidyo.ai",
    title: "ClipsHQ vs vidyo.ai",
    blurb:
      "Clip quality, captions and price compared - with ClipsHQ leading on multilingual accuracy.",
  },
  {
    slug: "best-ai-clip-generator",
    label: "Best AI Clip Generator",
    title: "Best AI Clip Generator (2026)",
    blurb:
      "The best AI clip generators of 2026, ranked - with ClipsHQ leading on value and simplicity.",
  },
  {
    slug: "cheapest-ai-clip-generator",
    label: "Cheapest AI Clip Generator",
    title: "Cheapest AI Clip Generator (2026)",
    blurb:
      "Where to get AI shorts for the least money, without watermarks or confusing credit math.",
  },
];

export function compareBySlug(slug: string): CompareDef | undefined {
  return COMPARE_PAGES.find((c) => c.slug === slug);
}
