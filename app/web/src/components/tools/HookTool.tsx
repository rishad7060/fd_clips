"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Sparkles, Zap } from "lucide-react";

/**
 * Free video hook generator - 100% client-side, no API. It slots the user's
 * topic into 10 proven opening-line patterns (curiosity, bold claim, question,
 * stat, mistake, story) that stop the scroll in the first seconds. Deterministic
 * and instant; nothing leaves the browser.
 */

function lower(s: string): string {
  return s.replace(/[.?!]+$/g, "").trim();
}

const TEMPLATES: ((t: string) => string)[] = [
  (t) => `Nobody talks about this, but ${t} is way easier than you think.`,
  (t) => `If you're struggling with ${t}, you're probably making this one mistake.`,
  (t) => `What if I told you everything you know about ${t} is wrong?`,
  (t) => `In the next 60 seconds, I'll show you how to master ${t}.`,
  (t) => `Most people get ${t} completely wrong - here's the fix.`,
  (t) => `This ${t} trick took me years to figure out. You get it for free.`,
  (t) => `Stop scrolling. This changes how you think about ${t}.`,
  (t) => `Here's the truth about ${t} that no one is telling you.`,
  (t) => `I wish someone told me this about ${t} when I started.`,
  (t) => `Want to get better at ${t}? Watch this before you do anything else.`,
];

function generate(topic: string): string[] {
  const clean = lower(topic);
  return Array.from(new Set(TEMPLATES.map((fn) => fn(clean))));
}

export function HookTool() {
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const hooks = useMemo(() => (submitted ? generate(submitted) : []), [submitted]);

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
      await navigator.clipboard.writeText(hooks.join("\n"));
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
          <Zap className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your video topic, e.g. saving money in your 20s"
            aria-label="Video topic"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Generate hooks
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · copy in one click
        </p>
      )}

      {submitted && hooks.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">{hooks.length} hooks</p>
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
            {hooks.map((t, i) => (
              <li key={t} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 text-sm text-ink-100">{t}</span>
                <button
                  type="button"
                  onClick={() => copyOne(t, i)}
                  aria-label={`Copy hook: ${t}`}
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
