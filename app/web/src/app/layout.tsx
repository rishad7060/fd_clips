import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CLERK_ENABLED } from "@/lib/auth";
import type { ReactNode } from "react";

// Inter (display + body) with tight tracking, plus a mono for scores/durations/
// timestamps (tabular figures). Geist would be the ideal display face but isn't
// in next/font on Next 14 — Inter, well-configured, is the premium fallback.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist",       // alias so the tailwind `sans` var resolves
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const interBody = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Clips — AI shorts from any long video",
  description:
    "Turn any podcast, interview, or long video into ranked, captioned, vertical clips. Built like Opus Clip.",
};

export const viewport: Viewport = {
  themeColor: "#905BF4",
};

/**
 * Root layout. Wraps the tree in ClerkProvider only when real Clerk keys are
 * configured; otherwise renders the app directly in dev/mock auth mode so it
 * works with no credentials. The dynamic import keeps @clerk/nextjs out of the
 * render path entirely when disabled.
 */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const body = (
    <body className={`${inter.variable} ${mono.variable} ${interBody.variable} font-sans antialiased`}>
      {children}
    </body>
  );

  if (CLERK_ENABLED) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    const { AuthTokenBridge } = await import("@/components/AuthTokenBridge");
    return (
      <ClerkProvider>
        <html lang="en">
          <body className={`${inter.variable} ${mono.variable} ${interBody.variable} font-sans antialiased`}>
            <AuthTokenBridge />
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return <html lang="en">{body}</html>;
}
