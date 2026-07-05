import type { Metadata } from "next";
import { HashtagTool } from "@/components/tools/HashtagTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Hashtag Generator - Free";
const DESCRIPTION =
  "Free YouTube hashtag generator. Enter your video topic or title and instantly get a ranked set of relevant hashtags to boost reach. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube hashtag generator",
    "youtube hashtags",
    "hashtags for youtube",
    "best youtube hashtags",
    "youtube tags generator",
    "free hashtag generator",
  ],
  alternates: { canonical: "/tools/youtube-hashtag-generator" },
  openGraph: {
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-hashtag-generator",
    images: ["/og/youtube-hashtag-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    images: ["/og/youtube-hashtag-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Enter your topic", body: "Type your video's topic or title - the more specific, the more relevant the hashtags." },
  { n: "2", title: "Get ranked hashtags", body: "We combine your keywords with proven YouTube-growth and niche hashtags, ordered by relevance." },
  { n: "3", title: "Copy and paste", body: "Copy all hashtags in one click and paste them into your video description or first comment." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How many hashtags should I use on YouTube?",
    a: "YouTube allows up to 15 hashtags per video and shows the first 3 above the title. Using more than 15 causes YouTube to ignore all of them, so pick your 10-15 most relevant hashtags - which is exactly what this generator ranks for you.",
  },
  {
    q: "Where do I put hashtags on a YouTube video?",
    a: "Paste them into the video description (they'll appear as clickable links above the title) or into the first comment. Put your 2-3 most important hashtags first.",
  },
  {
    q: "Is this YouTube hashtag generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so nothing you type is uploaded anywhere.",
  },
  {
    q: "Do hashtags actually help YouTube videos?",
    a: "Hashtags help YouTube understand your topic and make your video discoverable through hashtag pages and search. They work best combined with a strong title, description and - for Shorts - a hook in the first seconds.",
  },
];

export default function YoutubeHashtagGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-hashtag-generator"
        name="YouTube Hashtag Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Hashtag Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Hashtag Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Enter a topic and get a ranked set of relevant YouTube hashtags in
          seconds - copy them all in one click. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <HashtagTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          The right <strong className="text-white">YouTube hashtags</strong> help the algorithm
          understand your video and surface it on hashtag pages and in search.
          This free generator turns your topic into a ranked list of{" "}
          <strong className="text-white">hashtags for YouTube</strong> - your own keywords first,
          then relevant niche tags, then high-reach evergreen tags - capped at
          the 15 YouTube actually counts.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate YouTube hashtags</h2>
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

      <OtherTools currentSlug="youtube-hashtag-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Clips finds your best moments and returns ranked, captioned, vertical
          shorts - each with hashtag-ready titles - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
