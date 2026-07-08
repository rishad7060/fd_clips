import type { Metadata } from "next";
import { KeywordTool } from "@/components/tools/KeywordTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Keyword Generator - Free";
const DESCRIPTION =
  "Free YouTube keyword generator. Enter a topic and expand it into dozens of related keyword and tag ideas - modifiers, long-tail phrases and niche combos. No sign-up, copy them all in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube keyword generator",
    "youtube keyword tool",
    "youtube tags generator",
    "keyword ideas",
    "long tail keywords",
    "free keyword generator",
  ],
  alternates: { canonical: "/tools/youtube-keyword-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-keyword-generator",
    images: ["/og/youtube-keyword-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/youtube-keyword-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Enter a seed topic", body: "Type your core topic or a single seed keyword - this is what we expand from." },
  { n: "2", title: "Get keyword ideas", body: "We combine your topic with high-intent modifiers - how to, best, tutorial, for beginners, 2026, vs, review and more." },
  { n: "3", title: "Copy all", body: "Copy the full comma-separated list and paste it straight into your video's tags." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do keywords help a YouTube video?",
    a: "Keywords and tags help YouTube understand what your video is about and match it to searches and suggested feeds. Using your main keyword in the title, description and tags gives the algorithm consistent signals.",
  },
  {
    q: "What are long-tail keywords?",
    a: "Long-tail keywords are longer, more specific phrases like 'how to edit videos for beginners' rather than just 'video editing'. They have less competition and attract viewers with clear intent - this tool generates plenty of them.",
  },
  {
    q: "Is this keyword generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Where do I put these keywords?",
    a: "Use your strongest keyword in the title and first line of the description, sprinkle a few naturally through the description, and paste the rest into the tags field in YouTube Studio.",
  },
];

export default function YoutubeKeywordGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-keyword-generator"
        name="YouTube Keyword Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Keyword Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Keyword Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Enter a topic and expand it into dozens of related keyword and tag
          ideas - copy them all in one click. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <KeywordTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          The right tags help YouTube match your video to the right viewers. This
          free <strong className="text-white">YouTube keyword generator</strong> takes a single
          seed topic and expands it into dozens of{" "}
          <strong className="text-white">related keywords and long-tail tags</strong> using the
          modifiers real searchers type - how to, best, tutorial, for beginners,
          2026, vs, review and more - so you can fill your tags field in seconds.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate YouTube keywords</h2>
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

      <OtherTools currentSlug="youtube-keyword-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - each with keyword-ready titles - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
