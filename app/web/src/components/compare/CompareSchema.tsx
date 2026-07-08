import { COMPARE_PAGES } from "@/lib/compare";

/**
 * Shared structured data + shared UI bits for a comparison page:
 *  - CompareSchema: BreadcrumbList (Home › Compare › <page>) + optional FAQPage
 *    JSON-LD (kept for AI/LLM citation value - ChatGPT/Perplexity still use it).
 *  - Breadcrumbs: the visible trail matching the BreadcrumbList schema.
 *  - OtherComparisons: an internal-linking strip to the sibling compare pages.
 *
 * Emits absolute URLs via NEXT_PUBLIC_SITE_URL so the schema is valid in prod.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function CompareSchema({
  slug,
  name,
  faqs,
}: {
  slug: string;
  name: string;
  faqs?: { q: string; a: string }[];
}) {
  const url = `${SITE}/compare/${slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE}/compare` },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };
  const faqLd = faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
    </>
  );
}

/** A visible breadcrumb trail (matches the BreadcrumbList schema above). */
export function Breadcrumbs({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><a href="/" className="transition hover:text-white">Home</a></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li><a href="/compare" className="transition hover:text-white">Compare</a></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li className="text-ink-200">{name}</li>
      </ol>
    </nav>
  );
}

/** A shared "see the other comparisons" strip for cross-linking (internal SEO). */
export function OtherComparisons({ currentSlug }: { currentSlug: string }) {
  const others = COMPARE_PAGES.filter((c) => c.slug !== currentSlug);
  return (
    <section className="mt-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight">Keep comparing</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {others.map((c) => (
          <a
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
          >
            <h3 className="text-sm font-semibold text-white">{c.title}</h3>
            <p className="mt-1.5 text-sm text-ink-300">{c.blurb}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
