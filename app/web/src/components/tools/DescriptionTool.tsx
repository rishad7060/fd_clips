"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileText, Sparkles } from "lucide-react";

/**
 * Free YouTube description generator - 100% client-side, no API. It assembles a
 * well-structured description from the user's topic + optional links: a hook
 * line, a short summary, a timestamps placeholder, a CTA, relevant hashtags and
 * a links section. Deterministic and instant; nothing leaves the browser.
 */

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Clean topic word → hashtag token. */
function toTag(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
}

function hashtags(topic: string): string[] {
  const words = topic.split(/[\s,]+/).map((w) => w.trim()).filter(Boolean);
  const tags: string[] = [];
  const whole = toTag(topic);
  if (whole.length >= 3) tags.push(whole);
  for (const w of words) {
    const t = toTag(w);
    if (t.length >= 3 && !tags.includes(t)) tags.push(t);
  }
  for (const base of ["youtube", "shorts", "tutorial"]) {
    if (!tags.includes(base)) tags.push(base);
  }
  return tags.slice(0, 6);
}

function generate(topic: string, linksRaw: string): string {
  const clean = topic.trim();
  const nice = titleCase(clean);
  const lines: string[] = [];

  lines.push(`In this video, we break down everything you need to know about ${clean}. 👇`);
  lines.push("");
  lines.push(
    `Whether you're just getting started or looking to level up, this guide covers ${clean} in a clear, practical way you can put to use right away. Make sure to watch until the end for the key takeaways.`,
  );
  lines.push("");
  lines.push("⏱️ TIMESTAMPS");
  lines.push("0:00 Intro");
  lines.push("0:30 Getting started");
  lines.push("2:00 Key points");
  lines.push("5:00 Common mistakes");
  lines.push("8:00 Final tips");
  lines.push("");
  lines.push("🔔 If this helped, LIKE the video and SUBSCRIBE for more on " + nice + " - it really helps the channel!");
  lines.push("");

  const links = linksRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (links.length) {
    lines.push("🔗 LINKS & RESOURCES");
    for (const l of links) lines.push("👉 " + l);
    lines.push("");
  }

  lines.push("#" + hashtags(clean).join(" #"));

  return lines.join("\n");
}

export function DescriptionTool() {
  const [topic, setTopic] = useState("");
  const [links, setLinks] = useState("");
  const [submitted, setSubmitted] = useState<{ topic: string; links: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const description = useMemo(
    () => (submitted ? generate(submitted.topic, submitted.links) : ""),
    [submitted],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    if (!topic.trim()) return;
    setSubmitted({ topic: topic.trim(), links });
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(description);
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
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your video topic or title, e.g. how to edit videos in DaVinci Resolve"
            aria-label="Video topic or title"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="Optional - one link per line (website, gear, socials)"
          aria-label="Optional links, one per line"
          rows={3}
          className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-3 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Generate description
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · copy in one click
        </p>
      )}

      {submitted && description && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">Your description</p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-6 text-ink-200">
            {description}
          </pre>
        </div>
      )}
    </div>
  );
}
