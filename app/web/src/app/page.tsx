import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthControls } from "@/components/AuthControls";

const FEATURES = [
  {
    title: "Finds the viral moments",
    body: "A scoring model reads the full transcript and ranks every moment 0–100 on hook strength, emotional peak, quotability and payoff.",
    icon: "M13 2L3 14h7l-1 8 10-12h-7z",
  },
  {
    // MVP: MediaPipe face-detect center crop (good for single-speaker/talking-head).
    // PHASE 2: LR-ASD active-speaker tracking for multi-speaker podcasts.
    title: "Smart vertical reframe",
    body: "Face-aware cropping turns 16:9 into clean 1080×1920 verticals — tuned for single-speaker, talking-head videos.",
    icon: "M9 3v18M15 3v18M3 9h18M3 15h18",
  },
  {
    title: "Animated captions",
    body: "Word-by-word karaoke captions burned in, with RTL support for Arabic, Urdu, Tamil and more.",
    icon: "M4 6h16M4 12h10M4 18h7",
  },
];

// v2 MVP copy (fd_clips_v2.md): YouTube URL only, top 3 clips, emailed in ~30 min.
// PHASE 2: re-add file upload + "watch it live" progress + 5–10 clips messaging.
const STEPS = [
  ["Paste a YouTube link", "Drop the URL and the email to deliver to."],
  ["We do the work", "Transcribe, score, cut, reframe and caption — automatically."],
  ["Get them by email", "Your 3 best moments as captioned vertical clips in ~30 min."],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="hidden text-sm text-white/80 hover:text-white sm:block"
          >
            Dashboard
          </Link>
          <AuthControls />
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-850/60 px-3 py-1 text-xs font-medium text-brand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Now turning long videos into shorts
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">
          One long video.
          <br />
          <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-brand-400 bg-clip-text text-transparent">
            Three viral clips.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
          Paste a YouTube link and FocalDive Clips emails you your 3 best
          moments as ranked, captioned, vertical shorts — automatically. Built
          for creators, podcasters and coaches.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/new"
            className="w-full rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600 sm:w-auto"
          >
            Create clips free
          </Link>
          <Link
            href="/dashboard"
            className="w-full rounded-xl border border-ink-600 bg-ink-850/60 px-6 py-3 text-center text-sm font-semibold text-white/90 hover:border-brand sm:w-auto"
          >
            See a demo project
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          2 free videos · no credit card · clips by email in ~30 min
        </p>
      </section>

      {/* Mock preview strip */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-ink-700 bg-ink-900/70 p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {[92, 90, 84, 78, 75].map((score, i) => (
              <div
                key={i}
                className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gradient-to-br from-brand/40 to-ink-800 ring-1 ring-ink-700"
              >
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-accent">
                  {score}
                </span>
                <div className="absolute inset-x-2 bottom-2 space-y-1">
                  <div className="h-2 w-3/4 rounded bg-white/70" />
                  <div className="h-2 w-1/2 rounded bg-white/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
          From upload to posted in minutes
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <div
              key={title}
              className="rounded-2xl border border-ink-700 bg-ink-900/60 p-6"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/20 text-sm font-bold text-brand-400">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-850 to-ink-900 p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-white/65">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-500 sm:flex-row">
          <Logo />
          <span>© {new Date().getFullYear()} FocalDive Clips — demo build.</span>
        </div>
      </footer>
    </main>
  );
}
