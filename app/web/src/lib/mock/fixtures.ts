import type { ClipCandidate, ClipsDocument, TranscriptWord } from "../types";

/**
 * Inlined copy of tests/fixtures/clips.sample.json so the web app is
 * self-contained (does not reach outside app/web/). Conforms to CONTRACTS §3.
 */
export const SAMPLE_CLIPS: ClipsDocument = {
  job_id: "demo-job-0001",
  model: "mock-heuristic-v1",
  candidates: [
    {
      start: 16.28,
      end: 27.71,
      hook_line: "The real killer is building something nobody actually wants.",
      virality_score: 92,
      reason:
        "Strong contrarian hook plus a raw personal confession (18 months and entire savings lost). Complete thought, clear emotional payoff, highly quotable.",
      suggested_title: "The #1 Reason Startups Really Fail",
    },
    {
      start: 50.12,
      end: 62.04,
      hook_line: "Fall in love with the problem, not the solution.",
      virality_score: 90,
      reason:
        "Memorable, tweetable maxim with immediate elaboration. Self-contained advice that lands as a mic-drop and is endlessly shareable.",
      suggested_title: "Fall In Love With The Problem",
    },
    {
      start: 33.36,
      end: 44.18,
      hook_line: "Talk to ten customers before you write a single line of code.",
      virality_score: 84,
      reason:
        "Concrete, actionable rule with a clean if-then payoff. High practical value for the founder audience and easy to act on.",
      suggested_title: "The Ten-Customer Rule",
    },
    {
      start: 0.32,
      end: 11.07,
      hook_line: "The number one reason startups fail isn't what you think.",
      virality_score: 78,
      reason:
        "Open-loop curiosity hook that sets up a strong question. Slightly front-loaded as an intro but the tension drives retention.",
      suggested_title: "Why Most Startups Fail In Year One",
    },
    {
      start: 56.18,
      end: 67.51,
      hook_line:
        "The founders who win are obsessed with the pain, not their own cleverness.",
      virality_score: 75,
      reason:
        "Quotable insight reinforced by the co-host calling it the most important line of the year, which doubles as social proof.",
      suggested_title: "Obsessed With The Pain",
    },
    {
      start: 44.42,
      end: 55.94,
      hook_line:
        "A lot of founders fall in love with their idea. How do you stay honest?",
      virality_score: 71,
      reason:
        "Good question-and-answer arc on founder self-deception. Slightly overlaps the stronger 'problem not solution' clip but stands alone.",
      suggested_title: "How Founders Stay Honest",
    },
    {
      start: 21.89,
      end: 33.12,
      hook_line: "I spent eighteen months building a product zero people needed.",
      virality_score: 68,
      reason:
        "Vulnerable failure story with relatable stakes. Loses a few points because the strongest framing line lives in the adjacent higher-ranked clip.",
      suggested_title: "I Wasted 18 Months On The Wrong Product",
    },
    {
      start: 6.42,
      end: 16.04,
      hook_line: "Everybody says funding is the killer. You're telling me that's wrong?",
      virality_score: 61,
      reason:
        "Decent myth-busting setup and back-and-forth, but the resolution lands in a later segment so it feels slightly incomplete on its own.",
      suggested_title: "Funding Isn't The Startup Killer",
    },
  ],
};

/**
 * Minimal transcript-derived caption text per clip, keyed by candidate start.
 * Mirrors what captions.py slices from transcript.json for each clip range.
 * Kept short so the editor caption list is readable.
 */
export const SAMPLE_CAPTIONS: Record<number, { start: number; end: number; text: string }[]> = {
  16.28: [
    { start: 16.28, end: 17.62, text: "Funding is a symptom." },
    { start: 17.88, end: 21.65, text: "The real killer is building something nobody actually wants." },
    { start: 21.89, end: 24.71, text: "I spent eighteen months and my entire savings" },
    { start: 24.72, end: 27.71, text: "building a product zero people needed." },
  ],
  50.12: [
    { start: 50.12, end: 53.18, text: "Fall in love with the problem, not the solution." },
    { start: 53.41, end: 55.94, text: "The solution will change ten times." },
    { start: 56.18, end: 59.41, text: "The founders who win are obsessed with the pain," },
    { start: 59.63, end: 62.04, text: "not their own cleverness." },
  ],
  33.36: [
    { start: 33.36, end: 37.74, text: "Talk to ten potential customers before you write a single line of code." },
    { start: 38.02, end: 39.02, text: "Just ten." },
    { start: 39.26, end: 44.18, text: "And if you can't find ten people who care, that is your answer right there." },
  ],
};

/** Default caption fallback when a candidate has no canned lines. */
export function captionsFor(c: ClipCandidate): { start: number; end: number; text: string }[] {
  return (
    SAMPLE_CAPTIONS[c.start] ?? [
      { start: c.start, end: (c.start + c.end) / 2, text: c.hook_line },
      { start: (c.start + c.end) / 2, end: c.end, text: c.suggested_title + "." },
    ]
  );
}

const round3 = (n: number): number => +n.toFixed(3);

/**
 * Per-word clip-RELATIVE transcript for a candidate - mirrors the backend's
 * GET /clips/transcript shape so mock and real modes behave identically.
 *
 * Prefer SAMPLE_CAPTIONS (absolute-second lines): split each line into words,
 * spread evenly across the line's [start,end], then rebase by candidate.start
 * (dropping anything outside the clip, like the real slice). Falls back to the
 * same even-split synthesizer the controller uses (hook_line + suggested_title).
 */
export function wordsFor(c: ClipCandidate): TranscriptWord[] {
  const dur = Math.max(0.2, c.end - c.start);
  const lines = SAMPLE_CAPTIONS[c.start];
  if (lines && lines.length) {
    const words: TranscriptWord[] = [];
    for (const line of lines) {
      const toks = line.text.split(/\s+/).filter(Boolean);
      if (!toks.length) continue;
      const span = Math.max(0.01, line.end - line.start);
      const per = span / toks.length;
      toks.forEach((t, i) => {
        const absStart = line.start + i * per;
        const absEnd = line.start + (i + 1) * per;
        // Keep only words fully contained in the clip range, then rebase.
        if (absStart >= c.start && absEnd <= c.end) {
          words.push({
            word: t,
            start: round3(absStart - c.start),
            end: round3(absEnd - c.start),
          });
        }
      });
    }
    if (words.length) return words;
  }

  // Synthesizer - mirrors the controller's mock fallback exactly.
  const text = [c.hook_line, c.suggested_title].filter(Boolean).join(" ");
  const toks = text.split(/\s+/).filter(Boolean);
  const per = dur / Math.max(1, toks.length);
  return toks.map((t, i) => ({
    word: t,
    start: round3(i * per),
    end: round3((i + 1) * per),
  }));
}
