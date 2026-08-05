import { SEO_PAGES } from "@/lib/seoPages";

/**
 * Structured data + shared UI for a root-level SEO landing page:
 *  - SeoSchema: BreadcrumbList + WebApplication (free offer) + optional FAQPage
 *    JSON-LD. FAQPage is retained for AI/LLM citation value.
 *  - Breadcrumbs: the visible trail matching the BreadcrumbList schema.
 *  - RelatedSeoPages: internal-linking strip to sibling SEO pages.
 *
 * Absolute URLs come from NEXT_PUBLIC_SITE_URL so the schema is valid in prod.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function SeoSchema({
  slug,
  name,
  description,
  faqs,
}: {
  slug: string;
  name: string;
  description: string;
  faqs?: { q: string; a: string }[];
}) {
  const url = `${SITE}/${slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name, item: url },
    ],
  };
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `ClipsHQ - ${name}`,
    url,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
    </>
  );
}

/** Visible breadcrumb trail (matches the BreadcrumbList schema above). */
export function Breadcrumbs({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><a href="/" className="transition hover:text-white">Home</a></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li className="text-ink-200">{name}</li>
      </ol>
    </nav>
  );
}

/** Internal-linking strip to the other SEO pages. */
export function RelatedSeoPages({ currentSlug }: { currentSlug: string }) {
  const others = SEO_PAGES.filter((p) => p.slug !== currentSlug).slice(0, 6);
  return (
    <section className="mt-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
        Explore more
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {others.map((p) => (
          <a
            key={p.slug}
            href={`/${p.slug}`}
            className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
          >
            <h3 className="text-sm font-semibold text-white">{p.keyword}</h3>
            <p className="mt-1.5 text-sm text-ink-300">{p.blurb}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
