import type { Metadata } from "next";
import { TimestampTool } from "@/components/tools/TimestampTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Timestamp & Chapter Generator - Free";
const DESCRIPTION =
  "Free YouTube timestamp and chapter generator. Paste your chapter list in any order and get valid, ordered YouTube timestamps starting at 0:00 to unlock clickable chapters. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube timestamp generator",
    "youtube chapter generator",
    "youtube chapters",
    "video timestamps",
    "chapter markers",
    "free timestamp generator",
  ],
  alternates: { canonical: "/tools/youtube-timestamp-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-timestamp-generator",
    images: ["/og/youtube-timestamp-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/youtube-timestamp-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste your chapters", body: "One chapter per line - put the time and title in any order, or paste a plain list of titles." },
  { n: "2", title: "We format & validate", body: "We normalize the times, order them, force the first to 0:00, and flag anything YouTube won't accept." },
  { n: "3", title: "Copy and paste", body: "Copy the clean chapter list and paste it into your video description to unlock chapters." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do YouTube chapters work?",
    a: "YouTube turns timestamps in your description into clickable chapters when three rules are met: the first timestamp is 0:00, there are at least three timestamps, and each chapter is at least 10 seconds long. This tool enforces the first two automatically.",
  },
  {
    q: "What timestamp format does YouTube use?",
    a: "Use mm:ss for videos under an hour (e.g. 2:30) and hh:mm:ss for longer ones (e.g. 1:05:20), each followed by the chapter title. The generator outputs exactly this format.",
  },
  {
    q: "Is this timestamp generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Can I paste a messy list?",
    a: "Yes. Mix times before or after titles, use bare seconds, or paste a plain title list - the tool parses it, orders it and cleans it up for you.",
  },
];

export default function YoutubeTimestampGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-timestamp-generator"
        name="YouTube Timestamp & Chapter Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Timestamp Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Timestamp &amp; Chapter Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Paste your chapters in any order and get valid, ordered YouTube
          timestamps that unlock clickable chapters. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <TimestampTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Chapters make your video easier to navigate and can earn a key-moments
          spot in search. This free{" "}
          <strong className="text-white">YouTube timestamp generator</strong> takes your rough
          chapter list - times and titles in any order - and returns clean,
          ordered <strong className="text-white">YouTube chapters</strong> that start at 0:00, so
          they actually activate when you paste them into your description.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate YouTube chapters</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand-300">{s.n}</span>
              <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
                {f.q}
                <span className="ml-4 shrink-0 text-ink-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <OtherTools currentSlug="youtube-timestamp-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
