import { TOOLS } from "@/lib/tools";

/**
 * Shared structured data for a free-tool page: a BreadcrumbList (Home › Tools ›
 * <Tool>) and a WebApplication card (free, web-based). Optional FAQPage JSON-LD
 * is emitted when the page passes its FAQs - kept for AI/LLM citation value
 * (Google retired FAQ SERP rich results, but ChatGPT/Perplexity still use it).
 *
 * Emits absolute URLs via NEXT_PUBLIC_SITE_URL so the schema is valid in prod.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function ToolSchema({
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
  const url = `${SITE}/tools/${slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE}/tools` },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "Clips", url: `${SITE}/` },
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

/** A visible breadcrumb trail (matches the BreadcrumbList schema above). */
export function Breadcrumbs({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><a href="/" className="transition hover:text-white">Home</a></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li><a href="/tools" className="transition hover:text-white">Free Tools</a></li>
        <li aria-hidden className="text-ink-600">/</li>
        <li className="text-ink-200">{name}</li>
      </ol>
    </nav>
  );
}

/** A shared "explore the other free tools" strip for cross-linking (internal SEO). */
export function OtherTools({ currentSlug }: { currentSlug: string }) {
  const others = TOOLS.filter((t) => t.slug !== currentSlug);
  return (
    <section className="mt-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight">More free tools</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {others.map((t) => (
          <a
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-ink-800"
          >
            <h3 className="text-sm font-semibold text-white">{t.title}</h3>
            <p className="mt-1.5 text-sm text-ink-300">{t.blurb}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
