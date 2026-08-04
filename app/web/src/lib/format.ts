/** Small formatting helpers shared across components. */

export function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(
    cs,
  ).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.round(Math.max(0, seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Tailwind color band for a virality score badge (chip form). Only the top
 * clips (85+) get the premium GOLD band; strong clips are green, the rest are a
 * neutral slate so gold reads as "exceptional", not "everything". */
export function scoreColor(score: number): string {
  if (score >= 85) return "bg-amber-400/15 text-amber-300 ring-amber-400/40";
  if (score >= 70) return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40";
  return "bg-white/5 text-ink-200 ring-white/10";
}

/** Text-only colour for the big virality number on a clip card.
 * GOLD is reserved for exceptional clips (85+) - matching Opus, where only the
 * very best score glows gold. 70-84 = green (strong), 50-69 = white (fine),
 * below 50 = muted. This is the fix for "66 was showing gold". */
export function scoreTextColor(score: number): string {
  if (score >= 85) return "text-amber-300";   // gold - exceptional
  if (score >= 70) return "text-emerald-400";  // green - strong
  if (score >= 50) return "text-white";        // neutral - fine
  return "text-ink-400";                       // muted - weak
}
