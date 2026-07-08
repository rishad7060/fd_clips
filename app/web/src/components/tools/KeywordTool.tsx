"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Sparkles, Tags } from "lucide-react";

/**
 * Free YouTube keyword generator - 100% client-side, no API. It expands the
 * user's seed topic into dozens of related keyword / tag ideas by combining it
 * with high-intent modifiers (how to, best, tutorial, for beginners, 2026, vs,
 * review, etc.). Deterministic and instant; nothing leaves the browser.
 */

const YEAR = 2026;

// Prefix modifiers: "<modifier> <topic>".
const PREFIXES = [
  "how to",
  "best",
  "top",
  "easy",
  "free",
  "cheap",
  "diy",
  "learn",
];

// Suffix modifiers: "<topic> <modifier>".
const SUFFIXES = [
  "tutorial",
  "for beginners",
  "guide",
  "tips",
  "explained",
  "step by step",
  `${YEAR}`,
  "review",
  "ideas",
  "mistakes",
  "vs",
  "checklist",
  "examples",
];

function generate(topic: string): string[] {
  const clean = topic.toLowerCase().replace(/[.?!]+$/g, "").trim();
  if (!clean) return [];
  const out: string[] = [clean];
  for (const p of PREFIXES) out.push(`${p} ${clean}`);
  for (const s of SUFFIXES) out.push(`${clean} ${s}`);
  // A couple of blended long-tails.
  out.push(`best ${clean} ${YEAR}`);
  out.push(`how to ${clean} for beginners`);
  const seen = new Set<string>();
  return out.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function KeywordTool() {
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copied, setCopied] = useState(false);

  const keywords = useMemo(() => (submitted ? generate(submitted) : []), [submitted]);
  const commaString = keywords.join(", ");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setSubmitted(topic.trim());
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(commaString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40 sm:flex-row sm:items-center sm:pl-4"
      >
        <div className="flex flex-1 items-center gap-2 px-2 sm:px-0">
          <Tags className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your topic or seed keyword, e.g. drone photography"
            aria-label="Seed keyword"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Generate keywords
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · copy in one click
        </p>
      )}

      {submitted && keywords.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">{keywords.length} keyword ideas</p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-white/10 bg-ink-900 px-3 py-1 text-sm text-brand-300"
              >
                {k}
              </span>
            ))}
          </div>
          <div className="border-t border-white/[0.08] p-4">
            <p className="mb-1.5 text-xs font-medium text-ink-400">Ready to paste into your tags field</p>
            <p className="break-words rounded-lg bg-ink-950 p-3 text-sm text-ink-200">{commaString}</p>
          </div>
        </div>
      )}
    </div>
  );
}
