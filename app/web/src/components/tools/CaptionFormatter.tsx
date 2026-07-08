"use client";

import { useMemo, useState } from "react";
import { AlignLeft, Check, Copy, Sparkles } from "lucide-react";

/**
 * Free caption / subtitle formatter - 100% client-side, no API. It cleans messy
 * raw text or captions: collapses whitespace, strips common filler words
 * ("um", "uh", "like", "you know"...), applies sentence case, and wraps each
 * sentence to a readable ~42-character line length (the broadcast caption
 * standard). Pure text transform in the browser.
 */

const MAX_LINE = 42;

const FILLER = [
  "um",
  "uh",
  "erm",
  "hmm",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "like",
  "basically",
  "literally",
  "actually",
];

/** Remove filler words/phrases (whole-word, case-insensitive). */
function stripFiller(text: string): string {
  let out = text;
  for (const f of FILLER) {
    const re = new RegExp(`\\b${f.replace(/\s+/g, "\\s+")}\\b[,]?`, "gi");
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1");
}

/** Capitalize the first letter of each sentence; lower the rest of over-CAPS. */
function sentenceCase(text: string): string {
  // If mostly uppercase, lowercase it first so we can re-case cleanly.
  const letters = text.replace(/[^a-z]/gi, "");
  const upper = text.replace(/[^A-Z]/g, "").length;
  const base = letters.length > 0 && upper / letters.length > 0.6 ? text.toLowerCase() : text;
  return base.replace(/(^\s*[a-z])|([.!?]\s+[a-z])|(\bi\b)/g, (m) => m.toUpperCase());
}

/** Greedy word-wrap to <= MAX_LINE chars per line. */
function wrap(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + " " + w).length <= MAX_LINE) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function format(raw: string): string {
  const cleaned = sentenceCase(stripFiller(raw.replace(/\r\n/g, "\n"))).trim();
  // Split into sentences, wrap each, blank line between sentence groups.
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const blocks = sentences.map((s) => wrap(s).join("\n"));
  return blocks.join("\n").trim();
}

export function CaptionFormatter() {
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => (submitted ? format(submitted) : ""), [submitted]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setSubmitted(raw.trim());
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(output);
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
          <AlignLeft className="h-5 w-5 shrink-0" />
          <span className="text-xs font-medium">Paste raw text or messy captions - we clean, case and wrap them</span>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"so um basically today i want to like talk about how you know editing works and it's actually pretty simple"}
          aria-label="Raw caption text"
          rows={8}
          className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-3 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Format captions
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · ~42 char lines
        </p>
      )}

      {submitted && output && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">Formatted captions</p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-ink-200">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
