import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AUTH_ENABLED } from "@/lib/auth";
import { ReferralCapture } from "@/components/ReferralCapture";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ConsentManager } from "@/components/consent/ConsentManager";
import type { ReactNode } from "react";

// Inter (display + body) with tight tracking, plus a mono for scores/durations/
// timestamps (tabular figures). Geist would be the ideal display face but isn't
// in next/font on Next 14 - Inter, well-configured, is the premium fallback.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist",       // alias so the tailwind `sans` var resolves
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const interBody = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Display face for landing headlines - an editorial grotesque with character.
// Body stays on Inter; only elements that opt into `font-display` use this.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Absolute base for canonical + OpenGraph URLs. Without metadataBase, Next
// resolves relative canonical/OG URLs against localhost at build time, breaking
// them in production. Set NEXT_PUBLIC_SITE_URL to the real origin in prod.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ClipsHQ - AI Video Clips Delivered to Your Inbox",
    template: "%s | ClipsHQ",
  },
  description:
    "Turn any podcast, interview, or long video into ranked, captioned, vertical clips.",
  applicationName: "ClipsHQ",
  // Self-canonical for the homepage. Per-page metadata overrides this with its
  // own canonical; pages that don't set one inherit "/" resolved against
  // metadataBase, so every indexable page has a canonical.
  alternates: { canonical: "/" },
  // Explicit, permissive robots directives + the rich-preview settings Google
  // honors (large image previews, untruncated snippets, full video previews).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Search-engine ownership verification (optional). Paste the token from
  // Google Search Console / Bing Webmaster into these env vars to auto-emit the
  // verification <meta> tags - no code change or redeploy of the tag needed.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {},
  },
  openGraph: {
    type: "website",
    siteName: "ClipsHQ",
    url: "/",
    images: ["/og/default.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og/default.png"] },
};

export const viewport: Viewport = {
  themeColor: "#905BF4",
};

/**
 * Root layout. Wraps the tree in the Auth.js SessionProvider only when real auth
 * is configured (NEXT_PUBLIC_AUTH_ENABLED); otherwise renders the app directly
 * in dev/mock auth mode so it works with no credentials. The dynamic imports
 * keep next-auth out of the render path entirely when disabled.
 */
/**
 * Site-wide Organization + WebSite JSON-LD. Helps search engines recognize the
 * brand entity and can earn a sitelinks search box. Rendered once in the root
 * layout so every page carries it. Absolute URLs via NEXT_PUBLIC_SITE_URL.
 */
function SiteSchema() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ClipsHQ",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/emblem.png`,
    description:
      "AI that turns any long video into ranked, captioned, vertical short clips - plus free YouTube tools for creators.",
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ClipsHQ",
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/tools?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const bodyClass = `${inter.variable} ${mono.variable} ${interBody.variable} ${display.variable} font-sans antialiased`;

  if (AUTH_ENABLED) {
    const { SessionProvider } = await import("next-auth/react");
    const { AuthTokenBridge } = await import("@/components/AuthTokenBridge");
    return (
      <html lang="en">
        <body className={bodyClass}>
          <SiteSchema />
          {/* refetchInterval re-fetches the session every ~10 min (and on window
              focus), re-minting the app API token before it can go stale - so
              users rarely hit a 401 in the first place; if one still slips
              through, AuthTokenBridge auto-signs-out + re-prompts sign-in. */}
          <SessionProvider refetchInterval={600} refetchOnWindowFocus>
            <AuthTokenBridge />
            <ReferralCapture />
            <SmoothScroll>{children}</SmoothScroll>
            <ConsentManager />
          </SessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={bodyClass}>
        <SiteSchema />
        <ReferralCapture />
        <SmoothScroll>{children}</SmoothScroll>
        <ConsentManager />
      </body>
    </html>
  );
}
