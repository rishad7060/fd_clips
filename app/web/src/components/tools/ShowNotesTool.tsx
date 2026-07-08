"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ScrollText, Sparkles } from "lucide-react";

/**
 * Free podcast show-notes generator - 100% client-side, no API and NO AI call.
 * It formats the user's OWN pasted episode summary / transcript into clean show
 * notes: an optional title line, a short summary, key-point bullets pulled from
 * their strongest sentences, a timestamps placeholder and a links section
 * (URLs are auto-detected from the pasted text). Pure formatting in the browser.
 */

const URL_RE = /https?:\/\/[^\s)]+/g;

/** Split pasted text into clean, trimmed sentences. */
function toSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function generate(title: string, body: string): string {
  const links = Array.from(new Set(body.match(URL_RE) || []));
  const bodyNoUrls = body.replace(URL_RE, "").trim();
  const sentences = toSentences(bodyNoUrls);

  const out: string[] = [];
  const heading = title.trim() || "Episode Show Notes";
  out.push(`# ${heading}`);
  out.push("");

  // Summary = first 1-2 sentences (or the whole thing if short).
  out.push("## Summary");
  const summary = sentences.slice(0, 2).join(" ");
  out.push(summary || bodyNoUrls || "Add a short summary of this episode here.");
  out.push("");

  // Key points = the next several substantive sentences as bullets.
  out.push("## Key Takeaways");
  const points = sentences
    .slice(2)
    .filter((s) => s.split(" ").length >= 4)
    .slice(0, 8);
  if (points.length) {
    for (const p of points) out.push(`- ${p.replace(/[.]+$/, "")}`);
  } else {
    out.push("- Add your main takeaways here");
  }
  out.push("");

  out.push("## Timestamps");
  out.push("- 00:00 Intro");
  out.push("- 00:00 Main discussion");
  out.push("- 00:00 Wrap up");
  out.push("");

  out.push("## Links & Resources");
  if (links.length) {
    for (const l of links) out.push(`- ${l}`);
  } else {
    out.push("- Add episode links, guest socials and resources here");
  }
  out.push("");

  out.push("---");
  out.push("Enjoyed the episode? Follow the show and leave a review - it really helps!");

  return out.join("\n");
}

export function ShowNotesTool() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState<{ title: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const notes = useMemo(
    () => (submitted ? generate(submitted.title, submitted.body) : ""),
    [submitted],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    if (!body.trim()) return;
    setSubmitted({ title, body: body.trim() });
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(notes);
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
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Episode title (optional)"
            aria-label="Episode title"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste your episode summary or transcript here. Include any links and they'll be pulled into a Links section automatically."
          aria-label="Episode summary or transcript"
          rows={8}
          className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-3 text-sm text-white placeholder:text-ink-500 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Format show notes
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · formats your own text
        </p>
      )}

      {submitted && notes && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">Your show notes</p>
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
            {notes}
          </pre>
        </div>
      )}
    </div>
  );
}
