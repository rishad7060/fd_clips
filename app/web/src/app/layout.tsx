import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AUTH_ENABLED } from "@/lib/auth";
import { ReferralCapture } from "@/components/ReferralCapture";
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

export const metadata: Metadata = {
  title: "Clips - AI shorts from any long video",
  description:
    "Turn any podcast, interview, or long video into ranked, captioned, vertical clips. Built like Opus Clip.",
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
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const bodyClass = `${inter.variable} ${mono.variable} ${interBody.variable} font-sans antialiased`;

  if (AUTH_ENABLED) {
    const { SessionProvider } = await import("next-auth/react");
    const { AuthTokenBridge } = await import("@/components/AuthTokenBridge");
    return (
      <html lang="en">
        <body className={bodyClass}>
          <SessionProvider>
            <AuthTokenBridge />
            <ReferralCapture />
            {children}
          </SessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={bodyClass}>
        <ReferralCapture />
        {children}
      </body>
    </html>
  );
}
