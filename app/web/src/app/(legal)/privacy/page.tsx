import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Clips",
  description: "How Clips collects, uses, and protects your data.",
};

const UPDATED = "June 24, 2026";

export default function PrivacyPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Legal
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        Privacy Policy
      </h1>
      <p className="!mt-2 text-sm text-ink-400">Effective date: {UPDATED}</p>

      <h2>Introduction</h2>
      <p>
        This Privacy Policy explains how Clips (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, uses, and shares personal data when you use our platform,
        websites, and related services (the &ldquo;Services&rdquo;). By using the
        Services, you agree to the practices described here. This Policy is part
        of, and should be read together with, our{" "}
        <a href="/terms">Terms of Service</a>.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Account &amp; contact data</strong> - your name, email, and
          password or sign-in identifier when you create an account.
        </li>
        <li>
          <strong>Content you submit</strong> - video links and uploads, and the
          transcripts, clips, and captions generated from them.
        </li>
        <li>
          <strong>Communications</strong> - messages you send us for support or
          feedback.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Device &amp; usage data</strong> - IP address, browser and
          device type, and how you interact with the Services.
        </li>
        <li>
          <strong>Cookies &amp; similar technologies</strong> - used to keep you
          signed in, remember preferences, and measure usage (see below).
        </li>
      </ul>
      <h3>Payment data</h3>
      <p>
        When you purchase a plan, your card details are collected and processed
        directly by our payment processor. We receive limited information such as
        the card type, last four digits, and transaction status - we do not store
        full card numbers.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide, operate, and deliver the Services and the clips you request.</li>
        <li>To create and manage your account and process payments.</li>
        <li>To provide support and respond to your requests.</li>
        <li>To secure the Services, detect and prevent fraud and abuse, and debug issues.</li>
        <li>To improve our features and models, including testing and analytics.</li>
        <li>To send you service and, where permitted, marketing communications you can opt out of.</li>
        <li>To comply with legal obligations and enforce our terms.</li>
      </ul>

      <h2>How we share your information</h2>
      <p>We share personal data only as needed, with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> - hosting, storage, GPU compute,
          analytics, payment processing, and customer support vendors who process
          data on our behalf.
        </li>
        <li>
          <strong>Platforms you authorise</strong> - when you connect a social or
          source account to import or publish content.
        </li>
        <li>
          <strong>Legal &amp; safety</strong> - when required by law or to protect
          the rights, property, or safety of you, us, or others.
        </li>
        <li>
          <strong>Business transfers</strong> - in connection with a merger,
          acquisition, or sale of assets.
        </li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to run the Services (for example, to keep you
        signed in), and optional functional and analytics cookies to remember your
        settings and understand usage. You can control cookies through your
        browser settings; disabling some cookies may affect functionality.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep personal data for as long as your account is active or as needed
        to provide the Services, then for any additional period required to comply
        with legal obligations, resolve disputes, and enforce our agreements.
        Source videos and generated clips may be deleted automatically after a
        retention window associated with your plan.
      </p>

      <h2>Security</h2>
      <p>
        We use technical and organisational measures designed to protect your
        personal data. However, no method of transmission or storage is completely
        secure, so we cannot guarantee absolute security. Please protect your
        account by using a strong password and signing out on shared devices.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, or port your personal data, to object to or restrict certain
        processing, and to withdraw consent. To exercise these rights, email us at{" "}
        <a href="mailto:hello@clips.app">hello@clips.app</a>. We will respond
        within the timeframe required by applicable law and may need to verify
        your identity first.
      </p>

      <h2>Children&rsquo;s privacy</h2>
      <p>
        The Services are not directed to children under 16, and we do not
        knowingly collect personal data from them. If you believe a child has
        provided us personal data, contact us and we will delete it.
      </p>

      <h2>International transfers</h2>
      <p>
        We may process and store data in countries other than your own, including
        the United States. Where required, we use appropriate safeguards (such as
        standard contractual clauses) for international transfers.
      </p>

      <h2>Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. We will post changes on this
        page and update the effective date above. Significant changes may also be
        communicated by email or in-product notice.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Email us at{" "}
        <a href="mailto:hello@clips.app">hello@clips.app</a>.
      </p>
    </article>
  );
}
