import type { Metadata } from "next";
import { SubtitleTool } from "@/components/tools/SubtitleTool";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "YouTube Subtitle Downloader - Free SRT & VTT";
const DESCRIPTION =
  "Free YouTube subtitle downloader. Paste a link to download a video's captions as a ready-to-use SRT or VTT file - manual or auto-generated, any language. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "download youtube subtitles",
    "youtube subtitle downloader",
    "download youtube captions",
    "youtube srt download",
    "youtube vtt download",
    "download subtitles from youtube",
  ],
  alternates: { canonical: "/tools/youtube-subtitle-downloader" },
  openGraph: {
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/youtube-subtitle-downloader",
    images: ["/og/youtube-subtitle-downloader.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    images: ["/og/youtube-subtitle-downloader.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste a YouTube link", body: "Copy the URL of any public YouTube video and paste it above." },
  { n: "2", title: "We fetch the captions", body: "We grab the video's caption track - creator subtitles when available, otherwise auto-generated." },
  { n: "3", title: "Download SRT or VTT", body: "Download a properly timestamped .srt or .vtt file, ready for any video editor or player." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I download subtitles from a YouTube video?",
    a: "Paste the video's URL above and click Get subtitles. You'll then be able to download the captions as an SRT or VTT file with a single click - no sign-up required.",
  },
  {
    q: "What's the difference between SRT and VTT?",
    a: "Both are subtitle files. SRT (SubRip) is the most widely supported format for video editors and players. VTT (WebVTT) is the web-standard format used by HTML5 <track> and many streaming players. This tool exports both.",
  },
  {
    q: "Can I download auto-generated captions?",
    a: "Yes. If the creator didn't upload subtitles, we fall back to YouTube's auto-generated captions so you still get a usable subtitle file.",
  },
  {
    q: "Is it free?",
    a: "Yes - completely free, no account, no watermark. It's a free tool from Clips, which turns long videos into short vertical clips.",
  },
];

export default function YoutubeSubtitleDownloaderPage() {
  return (
    <div>
      <ToolSchema
        slug="youtube-subtitle-downloader"
        name="YouTube Subtitle Downloader"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="YouTube Subtitle Downloader" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          YouTube Subtitle Downloader
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Download any YouTube video&apos;s captions as an SRT or VTT file in
          seconds. Free, no sign-up, any language.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <SubtitleTool />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Need to <strong className="text-white">download subtitles from a YouTube video</strong>?
          Paste the link and this free <strong className="text-white">YouTube subtitle downloader</strong>{" "}
          pulls the caption track and hands you a clean, properly timestamped{" "}
          <strong className="text-white">SRT</strong> or <strong className="text-white">VTT</strong> file -
          perfect for editing, re-uploading, translating, or adding captions to
          your own edits. It works with both creator-uploaded and auto-generated
          captions, with no software to install.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to download YouTube subtitles</h2>
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

      <OtherTools currentSlug="youtube-subtitle-downloader" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn that video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Clips reads the whole video and emails you the 10 best moments as
          ranked, captioned, vertical shorts - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
