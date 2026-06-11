import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CLERK_ENABLED } from "@/lib/auth";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FocalDive Clips — AI shorts from any long video",
  description:
    "Turn any podcast, interview, or long video into 5–10 ranked, captioned, vertical clips. Built like Opus Clip.",
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
    <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
  );

  if (CLERK_ENABLED) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="en">{body}</html>
      </ClerkProvider>
    );
  }

  return <html lang="en">{body}</html>;
}
