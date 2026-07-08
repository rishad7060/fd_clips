import type { Metadata } from "next";
import { CaptionFormatter } from "@/components/tools/CaptionFormatter";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "Caption & Subtitle Formatter - Free";
const DESCRIPTION =
  "Free caption and subtitle formatter. Paste raw text or messy captions and instantly clean them up - wrap lines to a readable length, fix sentence case and strip filler words. Runs in your browser, no sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "caption formatter",
    "subtitle formatter",
    "caption line breaker",
    "clean up captions",
    "subtitle line length",
    "free caption tool",
  ],
  alternates: { canonical: "/tools/caption-formatter" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/caption-formatter",
    images: ["/og/caption-formatter.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/caption-formatter.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste your text", body: "Drop in raw text or messy auto-generated captions - however rough they are." },
  { n: "2", title: "We clean it up", body: "We strip filler words, fix sentence case and wrap each line to a readable ~42 characters." },
  { n: "3", title: "Copy and use", body: "Copy the clean, wrapped captions and paste them into your subtitles, video or caption file." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What line length should captions use?",
    a: "The broadcast standard is around 32-42 characters per line, with no more than two lines on screen at once. This formatter wraps your text to about 42 characters so captions stay comfortable to read.",
  },
  {
    q: "What does the formatter remove?",
    a: "It strips common filler words and hesitations - um, uh, like, you know, basically, actually and similar - collapses extra spaces, and applies proper sentence case, so messy auto-captions read cleanly.",
  },
  {
    q: "Is this caption formatter free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you paste is uploaded anywhere.",
  },
  {
    q: "Can I format captions from auto-generated subtitles?",
    a: "Yes - that's exactly what it's for. Paste the raw text from an auto-caption or transcript and it becomes clean, properly cased, readable lines you can drop into your captions.",
  },
];

export default function CaptionFormatterPage() {
  return (
    <div>
      <ToolSchema
        slug="caption-formatter"
        name="Caption & Subtitle Formatter"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="Caption & Subtitle Formatter" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Caption &amp; Subtitle Formatter
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Paste raw text or messy captions and get clean, properly wrapped lines
          in seconds. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <CaptionFormatter />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Auto-generated captions are rarely ready to publish. This free{" "}
          <strong className="text-white">caption formatter</strong> cleans them up in one pass -
          it strips filler words, restores proper{" "}
          <strong className="text-white">sentence case</strong> and wraps every line to the
          readable ~42-character standard broadcasters use, so your subtitles look
          professional instead of like a raw transcript dump.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to format captions</h2>
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

      <OtherTools currentSlug="caption-formatter" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - with clean burned-in captions - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
