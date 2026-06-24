import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Clips",
  description: "The terms that govern your use of Clips.",
};

const UPDATED = "June 24, 2026";

export default function TermsPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Legal
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        Terms of Service
      </h1>
      <p className="!mt-2 text-sm text-ink-400">Effective date: {UPDATED}</p>

      <h2>Introduction</h2>
      <p>
        Welcome to Clips. These Terms of Service (the &ldquo;Terms&rdquo;) govern
        your access to and use of the Clips platform, websites, and related
        products and features (together, the &ldquo;Services&rdquo;). By creating
        an account or otherwise using the Services, you agree to these Terms. If
        you do not agree, you may not use the Services. Questions? Email us at{" "}
        <a href="mailto:clipshq.pro@gmail.com">clipshq.pro@gmail.com</a>.
      </p>

      <h2>Who may use the Services</h2>
      <p>
        You must be at least 16 years old to use the Services. If you are under
        18, you represent that you have permission from a parent or legal
        guardian who agrees to these Terms on your behalf. If you use the
        Services on behalf of a company or organisation, you represent that you
        are authorised to bind that entity to these Terms.
      </p>

      <h2>Your account</h2>
      <p>
        You may need to register for an account to use some features. You agree
        to provide accurate, current information, to keep your credentials
        secure, and not to share your account. You are responsible for all
        activity that occurs under your account. Notify us promptly at{" "}
        <a href="mailto:clipshq.pro@gmail.com">clipshq.pro@gmail.com</a> if you suspect any
        unauthorised use.
      </p>

      <h2>Your content</h2>
      <p>
        &ldquo;Your Content&rdquo; means the videos, links, audio, transcripts,
        text, and other materials you submit to the Services. You retain
        ownership of Your Content. You grant Clips a worldwide, non-exclusive,
        royalty-free licence to host, store, reproduce, modify (for technical
        purposes such as transcoding and reframing), and process Your Content
        solely to operate and improve the Services and to deliver the clips you
        request.
      </p>
      <p>
        You represent and warrant that you own or have the necessary rights to
        Your Content and to the source videos you submit, and that processing
        them through the Services does not violate any law or the rights of any
        third party (including copyright, privacy, and publicity rights). You are
        solely responsible for Your Content.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree that you will not use the Services to:</p>
      <ul>
        <li>Infringe the intellectual property, privacy, or publicity rights of others.</li>
        <li>Upload or generate unlawful, harmful, deceptive, harassing, defamatory, or obscene material.</li>
        <li>Process content depicting minors unlawfully, or non-consensual or exploitative material.</li>
        <li>Reverse engineer, scrape, or attempt to extract the source code or models behind the Services.</li>
        <li>Use output from the Services to build a competing product, or resell access without our consent.</li>
        <li>Interfere with, overload, or circumvent the security or rate limits of the Services.</li>
        <li>Impersonate any person, or misuse another individual&rsquo;s name, voice, or likeness without authorisation.</li>
      </ul>
      <p>
        We may suspend or terminate access for any violation, and may use
        automated systems to detect abuse, fraud, or content that violates these
        Terms.
      </p>

      <h2>Credits, plans, and payments</h2>
      <p>
        Some features are free; others require credits or a paid plan
        (&ldquo;Paid Services&rdquo;). Credits are measured in source-minutes of
        video processed. Paid plans may renew automatically until cancelled. You
        authorise us and our payment processors to charge your selected payment
        method for the plan you choose, at the prices in effect at the time. Fees
        are non-refundable except where required by law. We may change pricing
        with notice; changes take effect at the start of your next billing cycle.
      </p>

      <h2>Third-party sources and services</h2>
      <p>
        The Services let you import videos from third-party platforms (such as
        YouTube) and may link to third-party websites and tools. We are not
        responsible for third-party content, terms, or practices. You are
        responsible for complying with the terms of any platform you import from
        and for having the rights to the content you process.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The Services, including their software, models, design, and branding, are
        owned by Clips and protected by intellectual property laws. We grant you
        a limited, non-exclusive, non-transferable licence to use the Services in
        accordance with these Terms. We reserve all rights not expressly granted.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Services and delete your account at any time. We
        may suspend or terminate your access if you breach these Terms or if we
        reasonably believe your use poses a risk to the Services or others.
        Termination may result in deletion of Your Content. Provisions that by
        their nature should survive termination (such as ownership, disclaimers,
        and limitations of liability) will survive.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Services are provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis, without warranties of any kind, whether express
        or implied, including merchantability, fitness for a particular purpose,
        and non-infringement. We do not warrant that the Services will be
        uninterrupted, error-free, or that AI-generated results (such as clip
        rankings or captions) will be accurate or suitable for any purpose.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Clips will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or for
        any loss of profits, data, or goodwill. Our total liability arising out of
        or relating to the Services will not exceed the greater of the amount you
        paid us in the twelve months before the claim, or USD&nbsp;100.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes,
        we will post a notice on this page and update the effective date above.
        Your continued use of the Services after changes take effect means you
        accept the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        For any questions about these Terms, contact us at{" "}
        <a href="mailto:clipshq.pro@gmail.com">clipshq.pro@gmail.com</a>.
      </p>
    </article>
  );
}
