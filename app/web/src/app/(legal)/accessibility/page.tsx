import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement - Clips",
  description: "Clips' commitment to an accessible, inclusive product.",
};

const UPDATED = "June 24, 2026";

export default function AccessibilityPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Legal
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        Accessibility Statement
      </h1>
      <p className="!mt-2 text-sm text-ink-400">Last updated: {UPDATED}</p>

      <h2>Our commitment</h2>
      <p>
        Clips is committed to making our product and website accessible and easy
        to use for everyone, including people with disabilities. We want every
        creator to be able to turn long videos into great short clips, regardless
        of how they browse, read, or interact with the web.
      </p>

      <h2>What we&rsquo;re doing</h2>
      <p>
        We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1
        Level AA as a measurable standard. In practice, that means we work to:
      </p>
      <ul>
        <li>Provide sufficient colour contrast in our dark interface and text.</li>
        <li>Support full keyboard navigation and visible focus states.</li>
        <li>Use semantic markup and ARIA labels so assistive technologies can interpret the interface.</li>
        <li>Respect the &ldquo;reduce motion&rdquo; system preference, including for smooth scrolling and animations.</li>
        <li>Offer accurate, word-by-word captions on generated clips, including right-to-left scripts.</li>
        <li>Write clear alternative text for meaningful images.</li>
      </ul>

      <h2>Ongoing effort</h2>
      <p>
        Accessibility is an ongoing process, not a one-time project. As we add
        features we test with keyboards and screen readers and review against the
        guidelines above. Some areas may not yet be fully accessible, and we are
        continually working to improve.
      </p>

      <h2>Third-party content</h2>
      <p>
        Parts of the Services rely on third-party tools and content (for example,
        imported videos and embedded players). While we cannot control the
        accessibility of third-party content, we encourage our partners to meet
        accessibility standards and we choose vendors with that in mind.
      </p>

      <h2>Feedback</h2>
      <p>
        If you have difficulty using any part of Clips, or you notice content or
        functionality that is not fully accessible, we want to hear from you.
        Email us at <a href="mailto:hello@clips.app">hello@clips.app</a> with
        &ldquo;Accessibility&rdquo; in the subject line and a description of the
        issue or a suggestion for improvement. We take this feedback seriously and
        will use it to keep improving.
      </p>
    </article>
  );
}
