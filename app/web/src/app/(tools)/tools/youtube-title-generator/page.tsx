import type { Metadata } from "next";
import { TitleTool } from "@/components/tools/TitleTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Video Title Generator - Free";
const DESCRIPTION =
  "Free YouTube title generator. Enter your topic and instantly get 10-15 catchy, clickable title ideas - how-to, listicle, question and curiosity-gap styles. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube title generator",
    "youtube video title generator",
    "catchy youtube titles",
    "clickable titles",
    "video title ideas",
    "free title generator",
  ],
  alternates: { canonical: "/tools/youtube-title-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-title-generator",
    images: ["/og/youtube-title-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/youtube-title-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Enter your topic", body: "Type your video's topic or a few keywords - the clearer the topic, the sharper the titles." },
  { n: "2", title: "Get 15 title ideas", body: "We slot your keywords into proven high-CTR headline formulas: how-to, listicle, question and curiosity-gap." },
  { n: "3", title: "Copy your favorite", body: "Copy any single title or grab the whole list, then paste it into YouTube Studio." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How long should a YouTube title be?",
    a: "Keep titles under about 60 characters so they don't get cut off in search and suggested feeds. Put your most important keyword and the curiosity hook near the front.",
  },
  {
    q: "What makes a YouTube title clickable?",
    a: "The best titles promise a clear benefit or open a curiosity gap, use a number or power word, and match what the viewer is searching for. This generator builds titles around those proven patterns.",
  },
  {
    q: "Is this YouTube title generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Can I use these titles for Shorts and TikTok too?",
    a: "Absolutely. The same curiosity-driven titles work as hooks and captions across YouTube Shorts, TikTok and Instagram Reels - just keep the strongest ones shortest.",
  },
];

export default function YoutubeTitleGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-title-generator"
        name="YouTube Video Title Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Title Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Video Title Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Enter a topic and get 10-15 catchy, clickable title ideas in seconds -
          copy any one in a click. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <TitleTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Your title decides whether anyone clicks. This free{" "}
          <strong className="text-white">YouTube title generator</strong> turns your topic into a
          list of <strong className="text-white">catchy, clickable titles</strong> built on the
          headline formulas top creators use - how-to, listicle, question,
          number and curiosity-gap. Generate a batch, pick the one that fits your
          video best, and A/B test the rest.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate YouTube titles</h2>
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

      <OtherTools currentSlug="youtube-title-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - each with a title-ready hook - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
