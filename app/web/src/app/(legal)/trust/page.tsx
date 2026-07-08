import type { Metadata } from "next";

const TITLE = "Trust & Privacy - ClipsHQ";
const DESCRIPTION =
  "How ClipsHQ handles your videos and data: private processing, source files removed after your clips are made, secure storage, and you own your clips.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/trust" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/trust",
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Do you share or sell my videos?",
    a: "No. Your videos and the clips we make from them are processed privately and are not shared with anyone or sold. They're used only to produce the clips you asked for.",
  },
  {
    q: "What happens to my source video after processing?",
    a: "Once your clips are made and delivered, the original source file you submitted is removed from our processing storage. We keep the finished clips available to you, not the raw source.",
  },
  {
    q: "Who owns the clips ClipsHQ creates?",
    a: "You do. You own the clips we generate from your video, and you're free to post and use them however you like.",
  },
  {
    q: "Does the free transcript tool store my data?",
    a: "No. Our free tools, like the YouTube-to-transcript tool, only read a video's own public captions to produce the result. They don't store your input and don't require a sign-up.",
  },
  {
    q: "How is my data stored?",
    a: "Files and account data are kept in secure storage with access limited to what's needed to run the service. We're a small team and we take a least-access approach to your content.",
  },
];

export default function TrustPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article className="legal-prose">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Trust
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        Trust &amp; Privacy
      </h1>
      <p className="!mt-2 text-sm text-ink-400">
        How we handle your videos and your data.
      </p>

      <p>
        When you hand a video to ClipsHQ, you&rsquo;re trusting us with your
        work. This page explains, in plain language, what we do with it. For the
        formal details, see our{" "}
        <a href="/privacy">Privacy Policy</a> and{" "}
        <a href="/terms">Terms of Service</a>.
      </p>

      <h2>Your videos are processed privately</h2>
      <p>
        The videos you submit and the clips we produce from them are processed
        privately. We do not share them with third parties and we do not sell
        them. Your content is used to do one thing: create the clips you
        requested.
      </p>

      <h2>Source files are removed after processing</h2>
      <p>
        We don&rsquo;t hold onto your raw footage longer than we need to. Once
        your clips are generated and delivered, the original source file you
        submitted is removed from our processing storage. What stays is the
        finished output you asked for.
      </p>

      <h2>Secure storage</h2>
      <p>
        Your files and account data are kept in secure storage, with access
        restricted to what&rsquo;s needed to run the service and support you. We
        take a least-access approach - only the systems and people who need to
        touch your content can.
      </p>

      <h2>You own your clips</h2>
      <p>
        You keep ownership of the clips ClipsHQ makes from your video. They&rsquo;re
        yours to download, post, and use however you like. We don&rsquo;t claim
        rights over your content beyond what&rsquo;s needed to process it and
        deliver your clips.
      </p>

      <h2>Free tools store nothing</h2>
      <p>
        Our free creator tools, like the YouTube-to-transcript tool, only read a
        video&rsquo;s own publicly available captions to produce a result. They
        don&rsquo;t require a sign-up and they don&rsquo;t store the links or
        transcripts you generate.
      </p>

      <h2>An honest note</h2>
      <p>
        ClipsHQ is an early, small SaaS. We&rsquo;re careful with your data and
        we&rsquo;ve described our practices here truthfully - we&rsquo;re not
        going to claim compliance certifications we don&rsquo;t hold. As we grow,
        we&rsquo;ll keep this page current. If you have a security or privacy
        question, email us at{" "}
        <a href="mailto:clipshq.pro@gmail.com">clipshq.pro@gmail.com</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <div className="mt-8 space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-rim"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
              {f.q}
              <span className="ml-4 shrink-0 text-ink-400 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink-300">{f.a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
