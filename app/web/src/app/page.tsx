import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthControls } from "@/components/AuthControls";
import { posterDataUri } from "@/lib/mock/posters";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing page — structured after the Opus Pro layout (hero + URL bar, product
 * demo strip, "every moment" feature cards, autopilot 3-step flow, captions
 * highlight, FAQ accordion, gradient CTA, multi-column footer) but with the
 * Clips brand, the #905BF4 accent, and copy that's truthful to what we ship:
 * YouTube in → ranked, captioned, vertical clips emailed in ~30 min.
 * ──────────────────────────────────────────────────────────────────────────── */

// Demo clips for the hero preview strip — rendered as real 9:16 poster SVGs.
const DEMO_CLIPS = [
  { rank: 1, hook: "This one habit changed everything", score: 96 },
  { rank: 2, hook: "Nobody talks about this part", score: 93 },
  { rank: 3, hook: "The real reason you procrastinate", score: 90 },
  { rank: 4, hook: "I wish I knew this at twenty", score: 85 },
  { rank: 5, hook: "Stop doing this immediately", score: 81 },
];

const PLATFORMS = ["YouTube", "TikTok", "Reels", "Shorts", "Podcasts", "LinkedIn"];

// The two flagship capabilities — our real pipeline, framed like Opus's
// ClipAnything / ReframeAnything cards.
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
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-ink-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
            <Link href="/help" className="transition hover:text-white">Help</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm text-ink-300 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/new"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
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
          className="pointer-events-none absolute inset-x-0 top-[-10rem] mx-auto h-[40rem] max-w-4xl rounded-full bg-brand/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-10 pt-20 text-center sm:pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            #1 AI shorts generator
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl">
            One long video, 10 viral clips.
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand to-brand-400 bg-clip-text text-transparent">
              Created 10× faster.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-300 sm:text-lg">
            Clips turns any podcast, interview or long video into ranked, captioned,
            vertical shorts — and emails your best moments in about 30 minutes.
          </p>

          {/* URL bar — visually an input + button, routes to /new */}
          <Link
            href="/new"
            className="group mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 p-2 pl-5 shadow-lift transition hover:border-brand/50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M13.19 8.69 8.5 13.38a3.32 3.32 0 0 0 4.69 4.69l6-6a4.43 4.43 0 1 0-6.26-6.26L6 12.31" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="flex-1 text-left text-sm text-ink-400 sm:text-base">
              Paste a YouTube link…
            </span>
            <span className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition group-hover:bg-brand-600">
              Get free clips
            </span>
          </Link>
          <p className="mt-3 text-xs text-ink-500">
            2 free videos · no credit card · clips by email in ~30 min
          </p>
        </div>

        {/* Product demo strip */}
        <div className="relative mx-auto max-w-5xl px-6 pb-8">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-4 shadow-lift sm:p-6">
            <div className="flex items-center gap-1.5 px-1 pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-xs text-ink-500">clips · ranked by virality</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {DEMO_CLIPS.map((c) => (
                <figure
                  key={c.rank}
                  className="group relative overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-brand/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterDataUri(c.rank, c.hook, c.score)}
                    alt={`Clip ${c.rank}: ${c.hook}`}
                    className="aspect-[9/16] w-full object-cover"
                  />
                </figure>
              ))}
            </div>
            {/* Score chip timeline */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {DEMO_CLIPS.map((c) => (
                <span
                  key={c.rank}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-850 px-3 py-1 text-xs text-ink-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  Clip {c.rank}
                  <span className="font-semibold text-brand-300">{c.score}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-4 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">
            Built for creators, podcasters &amp; coaches
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-ink-400">
            {PLATFORMS.map((p) => (
              <span key={p} className="transition hover:text-ink-200">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            The model
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
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
              className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-8 transition hover:border-brand/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl transition group-hover:bg-brand/20"
              />
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-300 ring-1 ring-brand/25">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </span>
              <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                {c.eyebrow}
              </p>
              <h3 className="relative mt-2 text-2xl font-bold">{c.title}</h3>
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
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
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
                <div className="h-full rounded-3xl border border-white/[0.08] bg-ink-950 p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-300 ring-1 ring-brand/25">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d={s.icon} />
                      </svg>
                    </span>
                    <span className="font-mono text-xs text-ink-500">0{i + 1}</span>
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-brand/15 via-ink-900 to-ink-950 p-8 sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                Animated captions
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
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
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-5xl">
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

      {/* ── CTA card ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-brand/30 via-brand-700/20 to-ink-950 px-6 py-16 text-center sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mx-auto h-64 max-w-2xl rounded-full bg-brand/20 blur-[100px]"
          />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-5xl">
            Get started with Clips
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-base text-ink-200">
            Your first 2 videos are free. Paste a link and get your best moments by
            email.
          </p>
          <Link
            href="/new"
            className="group relative mx-auto mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-white/15 bg-ink-950/60 p-2 pl-5 backdrop-blur transition hover:border-white/30"
          >
            <span className="flex-1 text-left text-sm text-ink-300 sm:text-base">
              Paste a YouTube link…
            </span>
            <span className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition group-hover:bg-white/90">
              Get free clips
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-ink-950">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Logo />
              <p className="mt-4 max-w-xs text-sm text-ink-400">
                Turn one long video into ranked, captioned, vertical clips —
                automatically.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                ["Create clips", "/new"],
                ["Dashboard", "/dashboard"],
                ["Credits & billing", "/billing"],
              ]}
            />
            <FooterCol
              title="Resources"
              links={[
                ["Help center", "/help"],
                ["Getting started", "/help/getting-started"],
                ["Supported sources", "/help/supported-sources"],
                ["Languages & RTL", "/help/speech-languages-and-rtl-captions"],
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                ["Caption styles", "/help/caption-presets-and-styles"],
                ["Free trial & plans", "/help/free-trial-and-plans"],
                ["Contact", "mailto:hello@clips.app"],
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-sm text-ink-500 sm:flex-row">
            <span>© {year} Clips — demo build.</span>
            <span>Made for creators.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-ink-400 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
