import type { Metadata } from "next";

const TITLE = "About ClipsHQ";
const DESCRIPTION =
  "ClipsHQ turns long videos into ranked, captioned, vertical shorts - paste a link and get them emailed in about 30 minutes. Here's why we built it and who it's for.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${TITLE} | Clips`,
    description: DESCRIPTION,
    type: "website",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        About
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        About ClipsHQ
      </h1>
      <p className="!mt-2 text-sm text-ink-400">
        The story behind the product, and why it exists.
      </p>

      <h2>Why ClipsHQ exists</h2>
      <p>
        Every long video - a podcast, a webinar, a coaching call, a talk - is
        full of moments that would do well as a short. The problem is finding
        them. Creators spend hours scrubbing through footage, guessing which
        30 seconds will land, cropping to vertical, and captioning by hand. It
        is slow, repetitive work that gets in the way of actually making things.
      </p>
      <p>
        ClipsHQ exists to take that work off your plate. You paste a link (or
        upload a file), and we do the rest: we read the whole video, rank the
        strongest moments, reframe them to a clean vertical 9:16, burn in
        word-by-word captions, and email you the finished clips in about 30
        minutes. No timeline to babysit, no editor to learn - you get shorts
        that are ready to post.
      </p>

      <h2>How it&rsquo;s different</h2>
      <p>
        We are not trying to be the biggest tool with the most buttons. We are
        trying to be the one that respects your time. A few things we do
        deliberately differently:
      </p>
      <ul>
        <li>
          <strong>Hands-off, email-first workflow.</strong> Submit a video and
          walk away. The clips arrive in your inbox when they&rsquo;re done -
          you don&rsquo;t have to sit in a dashboard and wait.
        </li>
        <li>
          <strong>Simple, minute-based pricing.</strong> You pay for the minutes
          of video you process. No confusing credit systems where you can&rsquo;t
          tell what a clip actually costs.
        </li>
        <li>
          <strong>Free creator tools.</strong> Some things shouldn&rsquo;t sit
          behind a paywall. Our free tools - like the YouTube-to-transcript
          tool - are genuinely free, with no sign-up.
        </li>
        <li>
          <strong>Strong multilingual captions.</strong> Captions work well
          across languages, including proper right-to-left rendering for Arabic
          and Urdu, and support for scripts like Hindi and Tamil - not just
          English.
        </li>
      </ul>

      <h2>Who it&rsquo;s for</h2>
      <p>
        ClipsHQ is built for people who make a lot of long-form content and want
        more out of it:
      </p>
      <ul>
        <li>
          <strong>Podcasters</strong> who want every episode to feed a week of
          shorts without hiring an editor.
        </li>
        <li>
          <strong>Coaches and educators</strong> turning talks, courses, and
          calls into clips that bring in the next audience.
        </li>
        <li>
          <strong>Creators and teams</strong> who&rsquo;d rather spend their
          time making content than cutting it up.
        </li>
      </ul>

      <h2>Who&rsquo;s behind it</h2>
      <p>
        ClipsHQ is early - we&rsquo;re a beta product, and we&rsquo;re honest
        about that. It&rsquo;s built by a small team passionate about creators,
        shipping improvements constantly and listening closely to the people who
        use it. If something isn&rsquo;t working or you have an idea, we want to
        hear it: reach us at{" "}
        <a href="mailto:clipshq.pro@gmail.com">clipshq.pro@gmail.com</a>.
      </p>
    </article>
  );
}
