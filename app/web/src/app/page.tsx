import Link from "next/link";
import { Logo } from "@/components/Logo";
import { posterDataUri } from "@/lib/mock/posters";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing page — layout adapted from the "Aeline" reference (centered nav,
 * two-line display headline with a highlighted second line, dual CTAs, a
 * floating fan of product cards over a brand glow, a rating strip, a logo
 * cloud, an "About" headline with inline icon badges, and a mixed-tone bento
 * stats grid) — re-skinned into the FocalDive Clips dark/brand design system
 * (near-black ink surfaces, #905BF4 brand accent, hairline borders). Copy stays
 * truthful: YouTube in → ranked, captioned, vertical clips emailed in ~30 min.
 * ──────────────────────────────────────────────────────────────────────────── */

// Demo clips for the hero fan + captions strip — rendered as real 9:16 SVGs.
const DEMO_CLIPS = [
  { rank: 1, hook: "This one habit changed everything", score: 96 },
  { rank: 2, hook: "Nobody talks about this part", score: 93 },
  { rank: 3, hook: "The real reason you procrastinate", score: 90 },
  { rank: 4, hook: "I wish I knew this at twenty", score: 85 },
  { rank: 5, hook: "Stop doing this immediately", score: 81 },
];

const PLATFORMS = ["YouTube", "TikTok", "Reels", "Shorts", "Podcasts", "LinkedIn"];

// Mixed-tone bento stats — the reference's four-card grid, our numbers.
const NAV_LINKS = [
  ["Features", "#features"],
  ["How it works", "#how"],
  ["About", "#about"],
  ["FAQ", "#faq"],
] as const;

// The two flagship capabilities — our real pipeline.
const CAPABILITIES = [
  {
    eyebrow: "Virality scoring",
    title: "Finds the moments worth posting",
    body: "A scoring model reads the entire transcript and ranks every moment 0–100 on hook strength, emotional peak, quotability and payoff — so you post the winners, not the filler.",
    icon: "M13 2 3 14h7l-1 8 10-12h-7z",
  },
  {
    eyebrow: "Smart reframe",
    title: "Reframes 16:9 into clean verticals",
    body: "Face-aware cropping turns wide footage into 1080×1920 verticals that keep the speaker centred — tuned for talking-head, podcast and interview videos.",
    icon: "M9 3v18M15 3v18M3 9h18M3 15h18",
  },
];

// The "on autopilot" three-step flow.
const STEPS = [
  {
    label: "Auto ingest",
    title: "Paste a YouTube link",
    body: "Drop the URL and the email to deliver to. No upload, no setup.",
    icon: "M13.19 8.69 8.5 13.38a3.32 3.32 0 0 0 4.69 4.69l6-6a4.43 4.43 0 1 0-6.26-6.26L6 12.31",
  },
  {
    label: "Auto editing",
    title: "We do the work",
    body: "Transcribe, score, cut, reframe and burn in captions — automatically, on GPU.",
    icon: "M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1",
  },
  {
    label: "Auto delivery",
    title: "Get them by email",
    body: "Your best moments as captioned vertical clips, in your inbox in ~30 minutes.",
    icon: "M4 6h16v12H4zM4 7l8 6 8-6",
  },
];

const FAQ = [
  {
    q: "How does Clips work?",
    a: "Paste a YouTube link and we transcribe the whole video, score every moment for viral potential, cut the best ones, reframe them to vertical 9:16, and burn in animated captions. Your top clips are emailed to you in about 30 minutes.",
  },
  {
    q: "What types of videos can I upload?",
    a: "Public YouTube links work best — podcasts, interviews, webinars, talks and streams. Long, talking-head and single-speaker videos give the cleanest vertical reframes.",
  },
  {
    q: "Which languages are supported?",
    a: "Transcription handles dozens of spoken languages, and captions render right-to-left for Arabic, Urdu, and more, plus scripts like Tamil — with proper word-by-word karaoke timing.",
  },
  {
    q: "Can I add captions?",
    a: "Every clip ships with word-by-word karaoke captions burned in. You can restyle colour, highlight and positioning in the editor before you export.",
  },
  {
    q: "Is Clips free to use?",
    a: "Yes — your first 2 videos are free, no credit card required. After that you top up with credits for more renders.",
  },
];

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-ink-950 text-white">
      {/* ── Nav (logo left · links centred · pill CTA right) ─────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-2 items-center px-6 py-3.5 md:grid-cols-3">
          <div className="flex justify-start">
            <Logo />
          </div>
          <nav className="hidden items-center justify-center gap-8 text-sm text-ink-300 md:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a key={label} href={href} className="transition hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm text-ink-300 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/new"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition duration-200 ease-premium hover:bg-white/90 active:scale-95"
            >
              Create clips — free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Brand glow behind the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-12rem] mx-auto h-[44rem] max-w-4xl rounded-full bg-brand/20 blur-[130px]"
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-4 pt-20 text-center sm:pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            #1 AI shorts generator
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.04] tracking-tighter sm:text-7xl">
            One long video,
            <br />
            <span className="mt-2 inline-flex items-baseline rounded-2xl bg-white/[0.04] px-4 py-1 ring-1 ring-white/10">
              <span className="bg-gradient-to-r from-brand-300 via-brand to-brand-400 bg-clip-text text-transparent">
                10 viral clips.
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-300 sm:text-lg">
            Clips turns any podcast, interview or long video into ranked, captioned,
            vertical shorts — and emails your best moments in about 30 minutes.
          </p>

          {/* Dual CTAs — ghost "Watch demo" + brand "Get started" w/ arrow circle */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#how"
              className="rounded-full border border-white/15 bg-ink-900/60 px-6 py-3 text-sm font-semibold text-ink-100 transition duration-200 ease-premium hover:border-white/30 hover:bg-ink-800 active:scale-95"
            >
              Watch demo
            </a>
            <Link
              href="/new"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand to-brand-600 active:scale-95"
            >
              Get started — free
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            2 free videos · no credit card · clips by email in ~30 min
          </p>
        </div>

        {/* Floating fan of clip posters — the signature hero element */}
        <div className="relative mx-auto max-w-4xl px-6 pb-6 pt-8">
          <div className="flex items-end justify-center [perspective:1400px]">
            {DEMO_CLIPS.map((c, i) => {
              const offset = i - (DEMO_CLIPS.length - 1) / 2; // -2 … 2
              const rotate = offset * 7;
              const lift = Math.abs(offset) * 30; // ends sit lower (arc)
              const z = DEMO_CLIPS.length - Math.abs(offset);
              return (
                <figure
                  key={c.rank}
                  className="group relative w-28 shrink-0 overflow-hidden rounded-2xl bg-ink-900 shadow-lift ring-1 ring-white/10 transition duration-300 ease-premium hover:z-20 hover:!translate-y-[-8px] hover:ring-brand/50 sm:w-36"
                  style={{
                    marginLeft: i === 0 ? 0 : "-1.75rem",
                    transform: `translateY(${lift}px) rotate(${rotate}deg)`,
                    zIndex: z,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterDataUri(c.rank, c.hook, c.score)}
                    alt={`Clip ${c.rank}: ${c.hook} — virality ${c.score}`}
                    className="aspect-[9/16] w-full object-cover"
                  />
                </figure>
              );
            })}
          </div>
        </div>

        {/* Rating strip */}
        <div className="relative mx-auto max-w-5xl px-6 pb-16 text-center">
          <p className="text-sm text-ink-300">
            Rated <span className="font-semibold text-white">4.9/5</span> by 4,900+ creators
          </p>
          <div className="mt-2 flex items-center justify-center gap-1 text-highscore" aria-label="4.9 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9z" />
              </svg>
            ))}
          </div>
        </div>
      </section>

      {/* ── Logo cloud ──────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.18em] text-ink-500">
            Built for creators, podcasters &amp; coaches
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base font-semibold text-ink-500 sm:gap-x-16">
            {PLATFORMS.map((p) => (
              <span key={p} className="transition hover:text-ink-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── About headline + bento stats ────────────────────────────────── */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            About us
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold leading-snug tracking-tight sm:text-5xl">
            Built to turn long videos into{" "}
            <IconBadge>
              <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
            </IconBadge>{" "}
            scroll-stopping shorts — with{" "}
            <IconBadge>
              <path d="M3 7h13l-3-3M21 17H8l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </IconBadge>{" "}
            zero editing.
          </h2>
        </div>

        {/* Bento grid — mixed tones, like the reference's four-card row */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand image card */}
          <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-white/15 sm:row-span-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterDataUri(1, DEMO_CLIPS[0]!.hook, DEMO_CLIPS[0]!.score)}
                alt=""
                className="aspect-[4/3] w-full object-cover opacity-90 sm:aspect-auto sm:h-44"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/20 to-transparent" />
            </div>
            <div className="p-6">
              <p className="text-4xl font-semibold tracking-tighter text-white">
                10<span className="text-brand-300"> clips</span>
              </p>
              <p className="mt-2 text-sm text-ink-300">
                Ranked, captioned and vertical — from a single upload.
              </p>
            </div>
          </article>

          {/* Neutral testimonial card */}
          <article className="flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-white/15 sm:col-span-1 lg:col-span-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Editing on your side
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tighter text-white">0%</p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {DEMO_CLIPS.slice(0, 4).map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c.rank}
                    src={posterDataUri(c.rank, "", 0)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-ink-850"
                  />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-ink-300">
                “Paste a link and walk away — it transcribes, scores, cuts, reframes
                and captions for you. Genuinely hands-off.”
              </p>
            </div>
          </article>

          {/* Accent high-score card (yellow + icon — compliant) */}
          <article className="relative overflow-hidden rounded-2xl border border-highscore/30 bg-highscore p-6 text-ink-950 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide">Top virality</span>
            </div>
            <p className="mt-3 text-5xl font-semibold tracking-tighter tabular-nums">96</p>
            <p className="mt-2 text-sm font-medium text-ink-950/80">
              Every moment scored 0–100 so you post the winners.
            </p>
          </article>

          {/* Dark stat card */}
          <article className="rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-white/15">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Languages
            </p>
            <p className="mt-3 flex items-baseline gap-1 text-5xl font-semibold tracking-tighter text-white">
              40<span className="text-brand-300">+</span>
            </p>
            <p className="mt-2 text-sm text-ink-300">
              Karaoke captions, including right-to-left scripts.
            </p>
          </article>
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            The model
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            AI that understands every moment of your video
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-300">
            Built for speed and accuracy — reads the whole transcript, finds what
            sticks, and frames it around whoever is speaking.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <article
              key={c.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-8 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-brand/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl transition group-hover:bg-brand/20"
              />
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-300 ring-1 ring-brand/25">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </span>
              <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                {c.eyebrow}
              </p>
              <h3 className="relative mt-2 text-2xl font-semibold">{c.title}</h3>
              <p className="relative mt-3 text-[15px] leading-relaxed text-ink-300">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Autopilot 3-step ────────────────────────────────────────────── */}
      <section id="how" className="border-y border-white/[0.06] bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Workflow automation
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
              From upload to inbox — on autopilot
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-ink-300">
              No timeline to scrub, no software to learn. Paste a link and your
              clips show up finished.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                {/* Connector arrow on desktop */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-[-18px] top-12 hidden text-ink-600 md:block"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                <div className="h-full rounded-2xl border border-white/[0.08] bg-ink-950 p-7 shadow-rim transition duration-200 ease-premium hover:-translate-y-0.5 hover:border-white/15">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-300 ring-1 ring-brand/25">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={s.icon} />
                      </svg>
                    </span>
                    <span className="font-mono text-xs tabular-nums text-ink-500">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                    {s.label}
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Captions highlight ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-brand/15 via-ink-900 to-ink-950 p-8 shadow-rim sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                Animated captions
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Word-by-word captions, in any language
              </h2>
              <p className="mt-4 max-w-md text-base text-ink-300">
                Karaoke-style captions are burned into every clip with perfect
                timing — and they render right-to-left for Arabic, Urdu, Tamil and
                more. Restyle colour, highlight and position in the editor.
              </p>
              <Link
                href="/help/speech-languages-and-rtl-captions"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 transition hover:text-brand-400"
              >
                See supported languages
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="flex justify-center gap-4">
              {DEMO_CLIPS.slice(0, 2).map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={c.rank}
                  src={posterDataUri(c.rank, c.hook, c.score)}
                  alt=""
                  className="w-36 rounded-2xl ring-1 ring-white/10 sm:w-40"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          Got questions?
        </h2>
        <div className="mt-10 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/40">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-left text-[15px] font-medium text-white marker:hidden">
                {item.q}
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-ink-300">{item.a}</p>
            </details>
          ))}
          <Link
            href="/help"
            className="flex items-center justify-between px-6 py-5 text-[15px] font-medium text-brand-300 transition hover:bg-white/[0.02] hover:text-brand-400"
          >
            I have more questions
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer (email CTA · big links · oversized wordmark · bar) ───── */}
      <footer className="border-t border-white/[0.06] bg-ink-950">
        <div className="mx-auto max-w-6xl px-6 pt-20">
          {/* Email CTA + Get-started card */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2.5 text-sm text-ink-300">
                <span className="h-2 w-9 rounded-full bg-gradient-to-r from-brand-300 to-brand" />
                Uncover the potency of <span className="font-semibold text-white">Clips</span> at
              </p>
              <a href="mailto:hello@clips.app" className="group mt-4 block w-fit max-w-full">
                <span className="block text-balance text-4xl font-semibold tracking-tighter text-white sm:text-6xl">
                  hello@clips.app
                </span>
                <span className="mt-3 block h-px w-full bg-white/15 transition duration-300 ease-premium group-hover:bg-brand" />
              </a>
            </div>

            <Link
              href="/new"
              className="group flex w-full shrink-0 flex-col justify-between gap-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand p-5 shadow-glow transition duration-200 ease-premium hover:-translate-y-0.5 active:scale-[0.98] lg:w-64"
            >
              <span className="text-2xl font-semibold tracking-tight text-white">Get started</span>
              <span className="flex items-center justify-between rounded-xl bg-ink-950/80 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/10">
                Go
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Big nav links + delivery block */}
          <div className="mt-16 flex flex-col justify-between gap-10 sm:flex-row">
            <nav className="flex flex-col gap-1.5 text-2xl font-medium tracking-tight text-white sm:text-3xl">
              <Link href="/new" className="w-fit transition hover:text-brand-300">Create clips</Link>
              <Link href="/help/free-trial-and-plans" className="w-fit transition hover:text-brand-300">Pricing</Link>
              <Link href="/help" className="w-fit transition hover:text-brand-300">Help center</Link>
            </nav>
            <div className="sm:text-right">
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Delivery</h3>
              <div className="mt-3 space-y-1 text-sm text-ink-400">
                <p>Ranked &amp; captioned</p>
                <p>9:16 verticals by email</p>
                <p>in ~30 minutes</p>
              </div>
            </div>
          </div>

          {/* Oversized brand wordmark — the actual Clips lockup */}
          <div className="mt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/label-logo.svg"
              alt="Clips"
              className="w-full select-none opacity-95"
              draggable={false}
            />
          </div>
        </div>

        {/* Bottom bar — brand-tinted band */}
        <div className="mt-6 border-t border-white/[0.06] bg-brand/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-sm text-ink-200 sm:flex-row">
            <span>© {year} Clips — demo build.</span>
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Remote · worldwide
            </span>
            <a href="https://instagram.com" className="transition hover:text-white">Instagram</a>
            <a href="https://linkedin.com" className="transition hover:text-white">LinkedIn</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* Inline circular icon badge used within the About headline. */
function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-grid h-9 w-9 translate-y-1.5 place-items-center rounded-full bg-brand/15 align-middle text-brand-300 ring-1 ring-brand/25 sm:h-12 sm:w-12">
      <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}
