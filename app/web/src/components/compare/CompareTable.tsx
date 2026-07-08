import { Check, Minus } from "lucide-react";

/**
 * Reusable comparison table for a "ClipsHQ vs <competitor>" page. Rows are
 * plain data so each page stays honest and factual: ClipsHQ specifics are
 * concrete, competitor cells stay high-level and fair.
 *
 * A row value can be a string (rendered as text) or `true`/`false` (rendered as
 * a success check / neutral dash) for boolean feature rows.
 */
export type Cell = string | boolean;

export interface CompareRow {
  label: string;
  clipshq: Cell;
  competitor: Cell;
}

function CellView({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        <span className="text-ink-200">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-500">
        <Minus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        <span>No</span>
      </span>
    );
  }
  return <span>{value}</span>;
}

export function CompareTable({
  competitorName,
  rows,
}: {
  competitorName: string;
  rows: CompareRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-5 py-4 font-medium text-ink-400"> </th>
            <th className="px-5 py-4 font-semibold text-brand-300">ClipsHQ</th>
            <th className="px-5 py-4 font-semibold text-white">{competitorName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-white/[0.06] last:border-0 align-top">
              <th scope="row" className="px-5 py-4 font-medium text-ink-200">
                {r.label}
              </th>
              <td className="px-5 py-4 text-ink-100">
                <CellView value={r.clipshq} />
              </td>
              <td className="px-5 py-4 text-ink-300">
                <CellView value={r.competitor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shared FAQ accordion (matches the tools-page pattern). */
export function Faq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto mt-16 max-w-3xl">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
              {f.q}
              <span className="ml-4 shrink-0 text-ink-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink-300">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Shared closing CTA to the paid app. */
export function CompareCta({
  heading = "Try ClipsHQ free",
  body = "Paste a YouTube link and ClipsHQ emails you the 10 best moments as ranked, captioned, vertical shorts - in about 30 minutes. No credit card to start.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h2>
      <p className="mx-auto mt-3 max-w-xl text-ink-300">{body}</p>
      <a
        href="/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
      >
        Try ClipsHQ free
      </a>
    </section>
  );
}
