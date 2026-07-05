import type { Metadata } from "next";
import { TagsTool } from "@/components/tools/TagsTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Tags Extractor - Free";
const DESCRIPTION =
  "Free YouTube tags extractor. Paste any video link to see the hidden tags and keywords it uses for SEO - great for competitor research. No sign-up, copy in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "youtube tags",
    "youtube tags extractor",
    "youtube tag extractor",
    "see youtube video tags",
    "youtube keywords",
    "extract youtube tags",
  ],
  alternates: { canonical: "/tools/youtube-tags-extractor" },
  openGraph: {
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-tags-extractor",
    images: ["/og/youtube-tags-extractor.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    images: ["/og/youtube-tags-extractor.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste a YouTube link", body: "Copy the URL of any public YouTube video - yours or a competitor's - and paste it above." },
  { n: "2", title: "We read the metadata", body: "We pull the tags the uploader set on the video, plus its category and view count." },
  { n: "3", title: "Copy the tags", body: "Copy the full tag list in one click to study what's working and inform your own SEO." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I see the tags of a YouTube video?",
    a: "Paste the video's URL above and click Extract tags. If the uploader set public tags, you'll see the full list, which you can copy in one click.",
  },
  {
    q: "Why can't I see tags for some videos?",
    a: "YouTube tags are optional - many creators leave them blank, and YouTube also hides them for some videos. When there are no public tags, the tool tells you so.",
  },
  {
    q: "Are YouTube tags still important for SEO?",
    a: "Tags are a minor ranking signal today - title, description, captions and viewer engagement matter far more. Tags are most useful for disambiguating your topic and for researching what competitors target.",
  },
  {
    q: "Is this tags extractor free?",
    a: "Yes - completely free, no sign-up. It's a free tool from Clips, which turns long videos into ranked, captioned short clips.",
  },
];

export default function YoutubeTagsExtractorPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-tags-extractor"
        name="YouTube Tags Extractor"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Tags Extractor" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Tags Extractor
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          See the tags and keywords any public YouTube video uses. Free, no
          sign-up - perfect for competitor research.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <TagsTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Want to see the <strong className="text-white">tags a YouTube video</strong> is using?
          This free <strong className="text-white">YouTube tags extractor</strong> reveals the
          hidden keywords behind any public video, so you can research what
          successful creators in your niche target and shape your own titles,
          descriptions and tags accordingly.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to extract YouTube tags</h2>
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

      <OtherTools currentSlug="youtube-tags-extractor" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn a video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Clips finds the best moments in any long video and returns ranked,
          captioned, vertical shorts - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
