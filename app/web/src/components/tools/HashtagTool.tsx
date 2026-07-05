"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Hash, Sparkles } from "lucide-react";

/**
 * Free YouTube hashtag generator - 100% client-side, no API. It expands the
 * user's topic/title into a ranked set of relevant hashtags by combining their
 * own keywords with curated YouTube-growth modifiers and niche packs. Deterministic
 * and instant; nothing leaves the browser.
 */

// Evergreen high-reach YouTube hashtags appended to most topics (broad reach).
const EVERGREEN = [
  "youtube",
  "youtubeshorts",
  "shorts",
  "viral",
  "trending",
  "fyp",
  "creator",
  "contentcreator",
  "subscribe",
];

// Niche packs keyed by a trigger word found in the topic → adds relevant tags.
const NICHE_PACKS: { match: RegExp; tags: string[] }[] = [
  { match: /\b(podcast|interview|episode)\b/i, tags: ["podcast", "podcastclips", "podcasting", "interview"] },
  { match: /\b(gym|fitness|workout|health)\b/i, tags: ["fitness", "gym", "workout", "fitnessmotivation", "health"] },
  { match: /\b(game|gaming|gameplay|stream)\b/i, tags: ["gaming", "gamer", "gameplay", "twitch", "letsplay"] },
  { match: /\b(music|song|beat|rap|singer)\b/i, tags: ["music", "newmusic", "musicvideo", "artist"] },
  { match: /\b(cook|recipe|food|kitchen)\b/i, tags: ["food", "recipe", "cooking", "foodie", "homecooking"] },
  { match: /\b(travel|trip|vlog|adventure)\b/i, tags: ["travel", "vlog", "travelvlog", "wanderlust", "adventure"] },
  { match: /\b(tech|coding|software|ai|program)\b/i, tags: ["tech", "technology", "coding", "ai", "programming"] },
  { match: /\b(business|marketing|money|entrepreneur|startup)\b/i, tags: ["business", "marketing", "entrepreneur", "sidehustle", "money"] },
  { match: /\b(beauty|makeup|skincare|fashion)\b/i, tags: ["beauty", "makeup", "skincare", "fashion", "grwm"] },
  { match: /\b(motivation|mindset|success|self)\b/i, tags: ["motivation", "mindset", "success", "selfimprovement", "discipline"] },
];

/** camelCase/space/punct → a clean lowercase hashtag token. */
function toTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
}

function generate(topic: string): string[] {
  const words = topic
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const fromWords: string[] = [];
  // The topic itself, spaces removed, as one strong hashtag.
  const whole = toTag(topic);
  if (whole.length >= 3) fromWords.push(whole);
  // Each meaningful word as its own tag.
  for (const w of words) {
    const t = toTag(w);
    if (t.length >= 3) fromWords.push(t);
  }
  // Two-word combos for longer-tail relevance.
  for (let i = 0; i < words.length - 1; i++) {
    const combo = toTag(words[i] + words[i + 1]);
    if (combo.length >= 5) fromWords.push(combo);
  }

  const niche = NICHE_PACKS.filter((p) => p.match.test(topic)).flatMap((p) => p.tags);

  // Order: the user's own keywords first (most relevant), then niche, then broad.
  const ordered = [...fromWords, ...niche, ...EVERGREEN];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of ordered) {
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  // YouTube shows the first 3 above the title and only counts the first 15.
  return out.slice(0, 30);
}

export function HashtagTool() {
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copied, setCopied] = useState(false);

  const tags = useMemo(() => (submitted ? generate(submitted) : []), [submitted]);
  const hashString = tags.map((t) => `#${t}`).join(" ");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setSubmitted(topic.trim());
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(hashString);
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
          <Hash className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your video topic or title, e.g. home gym workout for beginners"
            aria-label="Video topic or title"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Generate hashtags
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · copy in one click
        </p>
      )}

      {submitted && tags.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">{tags.length} hashtags</p>
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
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-ink-900 px-3 py-1 text-sm text-brand-300"
              >
                #{t}
              </span>
            ))}
          </div>
          <div className="border-t border-white/[0.08] p-4">
            <p className="mb-1.5 text-xs font-medium text-ink-400">Ready to paste into your description</p>
            <p className="break-words rounded-lg bg-ink-950 p-3 text-sm text-ink-200">{hashString}</p>
          </div>
        </div>
      )}
    </div>
  );
}
