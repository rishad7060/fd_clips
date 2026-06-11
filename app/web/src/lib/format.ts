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

/** Tailwind color band for a virality score badge. */
export function scoreColor(score: number): string {
  if (score >= 85) return "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40";
  if (score >= 70) return "bg-amber-500/20 text-amber-300 ring-amber-500/40";
  return "bg-sky-500/20 text-sky-300 ring-sky-500/40";
}
