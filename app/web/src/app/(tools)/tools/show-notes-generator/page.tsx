import type { Metadata } from "next";
import { ShowNotesTool } from "@/components/tools/ShowNotesTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "Podcast Show Notes Generator - Free";
const DESCRIPTION =
  "Free podcast show notes generator. Paste your episode summary or transcript and instantly format clean show notes - title, summary, key-point bullets, timestamps and a links section. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "podcast show notes generator",
    "show notes template",
    "episode notes generator",
    "podcast description generator",
    "free show notes",
    "podcast notes",
  ],
  alternates: { canonical: "/tools/show-notes-generator" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/show-notes-generator",
    images: ["/og/show-notes-generator.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/show-notes-generator.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste your text", body: "Drop in your episode summary or transcript, and an optional title. Any links are detected automatically." },
  { n: "2", title: "We format it", body: "We structure your text into a title, summary, key-takeaway bullets, a timestamps block and a links section." },
  { n: "3", title: "Copy and publish", body: "Copy the formatted show notes and paste them into your podcast host, blog or episode description." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are podcast show notes?",
    a: "Show notes are the written companion to a podcast episode - a summary, key takeaways, timestamps and links. They help listeners decide to press play, improve discoverability in search, and give people the resources you mentioned.",
  },
  {
    q: "Does this use AI to write my notes?",
    a: "No. This tool formats the text you paste - it structures your own summary or transcript into clean sections and pulls out links. Nothing is sent to an AI model or any server; it all runs in your browser.",
  },
  {
    q: "Is the show notes generator free?",
    a: "Yes, completely free with no sign-up. It runs entirely in your browser, so your episode content is never uploaded anywhere.",
  },
  {
    q: "What should good show notes include?",
    a: "A clear title, a 1-2 sentence summary, a handful of key-takeaway bullets, chapter timestamps, and links to anything mentioned or to the guest's socials. This tool lays out all of those sections for you.",
  },
];

export default function ShowNotesGeneratorPage() {
  return (
    <div>
      <ToolSchema
        slug="show-notes-generator"
        name="Podcast Show Notes Generator"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="Podcast Show Notes Generator" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Podcast Show Notes Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Paste your episode summary or transcript and get clean, formatted show
          notes in seconds. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <ShowNotesTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Clean show notes make your episodes easier to find and more inviting to
          play. This free{" "}
          <strong className="text-white">podcast show notes generator</strong> takes the summary
          or transcript you paste and formats it into a tidy{" "}
          <strong className="text-white">show notes template</strong> - title, summary,
          key-takeaway bullets, a timestamps block and an auto-detected links
          section. It formats your own words, so nothing is invented and nothing
          leaves your browser.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to generate show notes</h2>
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

      <OtherTools currentSlug="show-notes-generator" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your episode into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best podcast moments and returns ranked, captioned,
          vertical shorts - perfect for promoting each episode - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
