import type { Metadata } from "next";
import { SubtitleConverter } from "@/components/tools/SubtitleConverter";
import { Breadcrumbs, OtherTools, ToolSchema } from "@/components/tools/ToolSchema";

const TITLE = "SRT to VTT Converter - Free";
const DESCRIPTION =
  "Free SRT to VTT converter (and VTT to SRT). Paste or upload a subtitle file and convert between SubRip and WebVTT instantly, then download. Runs in your browser - no upload, no API, no sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "srt to vtt converter",
    "vtt to srt converter",
    "convert srt to vtt",
    "subtitle converter",
    "webvtt converter",
    "free subtitle converter",
  ],
  alternates: { canonical: "/tools/srt-to-vtt-converter" },
  openGraph: {
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    type: "website",
    url: "/tools/srt-to-vtt-converter",
    images: ["/og/srt-to-vtt-converter.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ClipsHQ`,
    description: DESCRIPTION,
    images: ["/og/srt-to-vtt-converter.png"],
  },
};

const STEPS = [
  { n: "1", title: "Paste or upload", body: "Drop in your .srt or .vtt file, or paste the subtitle text - we auto-detect the format." },
  { n: "2", title: "We convert it", body: "We swap the timestamp format, add or strip the WEBVTT header and re-number cues so the output is valid." },
  { n: "3", title: "Copy or download", body: "Copy the result or download it as a ready-to-use .srt or .vtt file." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the difference between SRT and VTT?",
    a: "Both are plain-text subtitle formats. SubRip (.srt) uses a comma in timestamps (00:00:01,000) and numbers each cue. WebVTT (.vtt) uses a dot (00:00:01.000), starts with a WEBVTT header, and is the format HTML5 video and the web use. This tool converts cleanly between them.",
  },
  {
    q: "Is my subtitle file uploaded anywhere?",
    a: "No. The entire conversion runs in your browser with JavaScript - your file never leaves your device and nothing is sent to a server.",
  },
  {
    q: "Can it convert VTT back to SRT?",
    a: "Yes, it works both ways. Paste or upload a .vtt file and the tool detects it, strips the WEBVTT header, restores commas in the timestamps and re-numbers the cues to produce a valid .srt.",
  },
  {
    q: "Is this converter free?",
    a: "Yes, completely free with no sign-up and no file-size limits beyond what your browser can hold in memory.",
  },
];

export default function SrtToVttConverterPage() {
  return (
    <div>
      <ToolSchema
        slug="srt-to-vtt-converter"
        name="SRT to VTT Converter"
        description={DESCRIPTION}
        faqs={FAQS}
      />
      <Breadcrumbs name="SRT to VTT Converter" />

      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Free tool</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          SRT to VTT Converter
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300 sm:text-lg">
          Convert subtitles between SRT and VTT in your browser, both directions -
          paste or upload, then download. Free, no sign-up.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <SubtitleConverter />
      </section>

      <section className="mx-auto mt-14 max-w-2xl text-ink-300">
        <p className="text-base leading-7">
          Need a caption file in a different format? This free{" "}
          <strong className="text-white">SRT to VTT converter</strong> - which also does{" "}
          <strong className="text-white">VTT to SRT</strong> - transforms your subtitles instantly
          and entirely in your browser. It swaps the comma-vs-dot timestamps,
          adds or removes the WEBVTT header and cleans up the cue numbering, so
          the file works wherever you need it: web players, editors or YouTube.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How to convert SRT to VTT</h2>
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

      <OtherTools currentSlug="srt-to-vtt-converter" />

      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn your video into viral clips</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          ClipsHQ finds your best moments and returns ranked, captioned, vertical
          shorts - with burned-in subtitles - in about 30 minutes.
        </p>
        <a href="/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-brand-400 to-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95">
          Make clips - free
        </a>
      </section>
    </div>
  );
}
