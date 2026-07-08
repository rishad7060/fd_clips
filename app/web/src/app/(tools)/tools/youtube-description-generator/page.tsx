import type { Metadata } from "next";
import { DescriptionTool } from "@/components/tools/DescriptionTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Description Generator - Free";
const DESCRIPTION =
  "Free YouTube description generator. Enter your topic and links to instantly build a formatted description with a hook, summary, timestamps, CTA, hashtags and links. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube description generator",
    "youtube description template",
    "video description generator",
    "youtube description ideas",
    "free description generator",
    "youtube seo description",
  ],
  alternates: { canonical: "/tools/youtube-description-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-description-generator",
    images: ["/og/youtube-description-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/youtube-description-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Enter your topic", body: "Type your video's topic or title, and optionally drop in any links you want to feature." },
  { n: "2", title: "Get a full description", body: "We build a structured description: hook line, summary, timestamps, subscribe CTA, hashtags and a links section." },
  { n: "3", title: "Copy and paste", body: "Copy the whole thing in one click and paste it into your YouTube description box." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What should a YouTube description include?",
    a: "A strong description opens with a keyword-rich hook in the first two lines, summarizes the video, lists timestamps/chapters, adds a subscribe CTA, links to related resources, and ends with a few relevant hashtags. This generator lays out all of those sections for you.",
  },
  {
    q: "How long should a YouTube description be?",
    a: "Aim for 150-300 words. The first 2-3 lines (about 120 characters) show above the fold, so front-load your keywords and hook there.",
  },
  {
    q: "Is this YouTube description generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Do the timestamps unlock YouTube chapters?",
    a: "The generator adds a timestamps block you can edit. Once your first timestamp is 0:00 and you have at least three, YouTube turns them into clickable chapters automatically. Use our timestamp generator to format them.",
  },
];

export default function YoutubeDescriptionGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-description-generator"
        name="YouTube Description Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Description Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Description Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Enter a topic and get a fully formatted description - hook, summary,
          timestamps, CTA, hashtags and links. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <DescriptionTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          A great description helps YouTube rank your video and gives viewers a
          reason to keep watching. This free{" "}
          <strong className="text-white">YouTube description generator</strong> assembles a
          complete, SEO-friendly <strong className="text-white">description template</strong> around
          your topic - a keyword-rich hook, a clear summary, a timestamps block,
          a subscribe call-to-action, relevant hashtags and your links - so you
          can fill the box in seconds instead of staring at a blank field.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate a YouTube description</h2>
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

      <OtherTools currentSlug="youtube-description-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - each with a ready-to-post caption - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
