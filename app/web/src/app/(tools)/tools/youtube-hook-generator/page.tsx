import type { Metadata } from "next";
import { HookTool } from "@/components/tools/HookTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "Video Hook Generator - Free";
const DESCRIPTION =
  "Free video hook generator. Enter your topic and get 10 scroll-stopping opening lines - curiosity, bold-claim, question and stat hooks for YouTube, Shorts, TikTok and Reels. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "video hook generator",
    "youtube hook generator",
    "hook ideas",
    "tiktok hooks",
    "opening line generator",
    "attention grabbing hooks",
  ],
  alternates: { canonical: "/tools/youtube-hook-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-hook-generator",
    images: ["/og/youtube-hook-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/youtube-hook-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Enter your topic", body: "Type what your video is about - a phrase or a few keywords is enough." },
  { n: "2", title: "Get 10 hooks", body: "We generate opening lines across proven patterns: curiosity, bold claim, question, stat, mistake and story." },
  { n: "3", title: "Copy and record", body: "Copy your favorite hook and say it in the first 3 seconds of your video to stop the scroll." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a video hook?",
    a: "A hook is the first line or two of your video - the moment that decides whether a viewer keeps watching or scrolls away. Strong hooks create curiosity, make a bold claim, ask a question or drop a surprising stat.",
  },
  {
    q: "Why are hooks so important on YouTube and TikTok?",
    a: "Platforms measure how many people keep watching past the first few seconds. A great hook lifts that retention, which tells the algorithm to push your video to more people. It's the single highest-leverage line in your script.",
  },
  {
    q: "Is this hook generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Can I use these hooks for Shorts, Reels and TikTok?",
    a: "Yes. These opening lines work anywhere retention matters - YouTube long-form and Shorts, TikTok and Instagram Reels. Pair a strong hook with fast pacing for the best results.",
  },
];

export default function YoutubeHookGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-hook-generator"
        name="Video Hook Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="Video Hook Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Video Hook Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Enter a topic and get 10 scroll-stopping opening lines in seconds -
          copy any one in a click. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <HookTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          The first three seconds make or break a video. This free{" "}
          <strong className="text-white">video hook generator</strong> turns your topic into 10{" "}
          <strong className="text-white">attention-grabbing opening lines</strong> across the
          patterns that consistently boost retention - curiosity gaps, bold
          claims, direct questions and surprising stats. Open with one of these
          and give the algorithm a reason to keep pushing your video.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate video hooks</h2>
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

      <OtherTools currentSlug="youtube-hook-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your most hook-worthy moments and returns ranked,
          captioned, vertical shorts - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
