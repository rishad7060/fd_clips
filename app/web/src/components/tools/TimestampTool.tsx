"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ListOrdered, Sparkles } from "lucide-react";

/**
 * Free YouTube timestamp / chapter generator - 100% client-side, no API. It
 * parses pasted lines that mix timestamps and titles (in any common order), and
 * outputs valid YouTube chapters: normalized mm:ss / hh:mm:ss, ordered, and
 * guaranteed to start at 0:00 (YouTube's requirement to unlock chapters).
 */

interface Chapter {
  seconds: number;
  label: string;
}

/** Parse a "1:23", "01:02:03" or "83" style token → seconds, or null. */
function parseTime(token: string): number | null {
  const t = token.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10); // bare seconds
  const m = t.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const c = m[3] !== undefined ? parseInt(m[3], 10) : null;
  if (c !== null) return a * 3600 + b * 60 + c; // h:m:s
  return a * 60 + b; // m:s
}

/** Format seconds → YouTube-valid chapter timestamp. */
function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

interface Result {
  text: string;
  count: number;
  warnings: string[];
}

function generate(raw: string): Result {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const chapters: Chapter[] = [];
  const warnings: string[] = [];
  let autoIndex = 0;

  for (const line of lines) {
    // Find a timestamp anywhere in the line (start or end).
    const tsMatch = line.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
    let seconds: number | null = null;
    let label = line;
    if (tsMatch) {
      seconds = parseTime(tsMatch[1]);
      label = line.replace(tsMatch[1], "").replace(/^[\s\-–—:.)]+|[\s\-–—:.)]+$/g, "").trim();
    }
    if (seconds === null) {
      // Plain list line with no timestamp - auto-space by 1 minute.
      seconds = autoIndex * 60;
      warnings.push(`No time on "${line.slice(0, 40)}" - auto-set to ${fmt(seconds)}`);
    }
    if (!label) label = `Chapter ${chapters.length + 1}`;
    chapters.push({ seconds, label });
    autoIndex++;
  }

  // Order by time.
  chapters.sort((a, b) => a.seconds - b.seconds);

  // YouTube requires the first chapter to be 0:00.
  if (chapters.length && chapters[0].seconds !== 0) {
    chapters[0] = { ...chapters[0], seconds: 0 };
    warnings.push("First chapter must start at 0:00 - adjusted for you.");
  }
  if (chapters.length < 3) {
    warnings.push("YouTube needs at least 3 chapters to show them. Add more lines.");
  }

  const text = chapters.map((c) => `${fmt(c.seconds)} ${c.label}`).join("\n");
  return { text, count: chapters.length, warnings };
}

export function TimestampTool() {
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo<Result | null>(() => (submitted ? generate(submitted) : null), [submitted]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setSubmitted(raw.trim());
  }

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
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
        className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40"
      >
        <div className="mb-2 flex items-center gap-2 text-ink-400">
          <ListOrdered className="h-5 w-5 shrink-0" />
          <span className="text-xs font-medium">Paste one chapter per line - time and title in any order</span>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"0:00 Intro\n2:30 Getting started\n5:15 Main tips\nWrap up 8:40"}
          aria-label="Chapter list"
          rows={7}
          className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-3 font-mono text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Format chapters
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · valid YouTube chapters
        </p>
      )}

      {result && result.count > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">{result.count} chapters</p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-ink-200">
            {result.text}
          </pre>
          {result.warnings.length > 0 && (
            <div className="border-t border-white/[0.08] p-4">
              <p className="mb-1.5 text-xs font-medium text-ink-400">Notes</p>
              <ul className="space-y-1 text-xs text-amber-300/90">
                {result.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
