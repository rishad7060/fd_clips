"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Floating "Drop a video link" bar, pinned to the bottom of the landing page
 * (Opus-style). Typing a link and hitting "Get free clips" hands off to the
 * builder at /new with the URL prefilled. It auto-hides once the footer is in
 * view so it never permanently covers the page chrome.
 */
export function StickyLinkBar() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [hidden, setHidden] = useState(false);

  // Hide near the very bottom of the page so it doesn't sit over the footer.
  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 160;
      setHidden(nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = url.trim();
    router.push(u ? `/new?url=${encodeURIComponent(u)}` : "/new");
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-300 ease-premium ${
        hidden ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <form
        onSubmit={submit}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 p-2 pl-4 shadow-lift backdrop-blur-xl"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-ink-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
        </svg>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Drop a video link"
          aria-label="Video link"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition duration-200 ease-premium hover:bg-white/90 active:scale-95"
        >
          Get free clips
        </button>
      </form>
    </div>
  );
}
