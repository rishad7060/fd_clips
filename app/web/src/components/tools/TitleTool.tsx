"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Sparkles, Type } from "lucide-react";

/**
 * Free YouTube title generator - 100% client-side, no API. It expands the
 * user's topic into 10-15 catchy, clickable title variations by slotting their
 * keywords into proven high-CTR headline templates (how-to, listicle, question,
 * number, curiosity-gap). Deterministic and instant; nothing leaves the browser.
 */

/** Title-case a phrase for headline styling. */
function titleCase(s: string): string {
  const small = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "with"]);
  const words = s.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i !== 0 && i !== words.length - 1 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const YEAR = 2026;

// Each template takes the cleaned topic and returns a full title.
const TEMPLATES: ((t: string) => string)[] = [
  (t) => `How to ${t} (Step-by-Step Guide)`,
  (t) => `${t}: The Complete Beginner's Guide`,
  (t) => `7 ${t} Tips That Actually Work`,
  (t) => `The Truth About ${t} Nobody Tells You`,
  (t) => `Why Your ${t} Isn't Working (And How to Fix It)`,
  (t) => `${t} in ${YEAR}: What You Need to Know`,
  (t) => `I Tried ${t} for 30 Days - Here's What Happened`,
  (t) => `Stop Doing ${t} Wrong - Do This Instead`,
  (t) => `The Fastest Way to ${t}`,
  (t) => `${t} Explained in Under 10 Minutes`,
  (t) => `5 ${t} Mistakes Beginners Always Make`,
  (t) => `What They Don't Teach You About ${t}`,
  (t) => `${t} for Beginners: Everything You Need`,
  (t) => `Is ${t} Worth It? (Honest Review)`,
  (t) => `The Ultimate ${t} Guide (${YEAR} Edition)`,
];

function generate(topic: string): string[] {
  const clean = titleCase(topic.replace(/[.?!]+$/g, "").trim());
  const out = TEMPLATES.map((fn) => fn(clean));
  // Dedupe (some templates can collide on very short topics).
  return Array.from(new Set(out));
}

export function TitleTool() {
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const titles = useMemo(() => (submitted ? generate(submitted) : []), [submitted]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopiedIdx(null);
    setCopiedAll(false);
    setSubmitted(topic.trim());
  }

  async function copyOne(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(titles.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
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
          <Type className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your video topic or keywords, e.g. growing tomatoes at home"
            aria-label="Video topic or keywords"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Generate titles
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · copy in one click
        </p>
      )}

      {submitted && titles.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">{titles.length} title ideas</p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              {copiedAll ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedAll ? "Copied" : "Copy all"}
            </button>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {titles.map((t, i) => (
              <li key={t} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 text-sm text-ink-100">{t}</span>
                <button
                  type="button"
                  onClick={() => copyOne(t, i)}
                  aria-label={`Copy title: ${t}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
                >
                  {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
