import Link from "next/link";
import { PROOF_STATS, HERO_LANGUAGES } from "@/lib/proof";

/**
 * Reusable, on-brand building blocks for the SEO landing pages so every page
 * shares one CTA, FAQ, feature and proof treatment (consistency reads premium
 * and keeps the pages fast to author). All use design-system tokens.
 */

/** Primary + secondary CTA pair. Spec: "Try Free" / "Upload Video", never "Learn More". */
export function SeoCta({
  heading = "Turn long videos into viral shorts",
  sub,
}: {
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-ink-850 p-8 text-center shadow-rim sm:p-10">
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {heading}
      </h2>
      {sub ? <p className="mx-auto mt-3 max-w-xl text-ink-300">{sub}</p> : null}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/new"
          className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-95"
        >
          Try Free
        </Link>
        <Link
          href="/new"
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-ink-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-700 active:scale-95"
        >
          Upload Video
        </Link>
      </div>
      <p className="mt-4 text-xs text-ink-400">Free to start - no credit card required.</p>
    </section>
  );
}

/** A compact proof band (reads from the editable proof.ts constants). */
export function SeoProofBand() {
  return (
    <section className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PROOF_STATS.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-white/10 bg-ink-850 p-5 text-center shadow-rim"
        >
          <div className="font-display text-2xl font-semibold text-white sm:text-3xl">
            {s.value}
          </div>
          <div className="mt-1 text-xs text-ink-400">{s.label}</div>
        </div>
      ))}
    </section>
  );
}

/** Language chip row - the multilingual differentiator, reused across pages. */
export function LanguageChips() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {HERO_LANGUAGES.map((l) => (
        <span
          key={l.code}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-850 px-3 py-1.5 text-xs font-medium text-ink-200"
        >
          {l.name}
          {l.rtl ? (
            <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-300">
              RTL
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/** A titled feature block (H2 + supporting copy + optional bullet list). */
export function FeatureBlock({
  title,
  children,
  bullets,
}: {
  title: string;
  children: React.ReactNode;
  bullets?: string[];
}) {
  return (
    <section className="mx-auto mt-12 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-ink-300">{children}</div>
      {bullets?.length ? (
        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-base leading-7 text-ink-300">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Accessible FAQ (matches the FAQPage schema emitted by SeoSchema). */
export function SeoFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto mt-16 max-w-2xl">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
        Frequently asked questions
      </h2>
      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
              {f.q}
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink-300">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
