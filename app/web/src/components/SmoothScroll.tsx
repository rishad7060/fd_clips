"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Global Lenis smooth-scroll provider. Mounted once in the root layout so every
 * page (landing, dashboard, admin) inherits inertial wheel/touch scrolling.
 *
 * The app scrolls on the window - the AppShell uses `min-h-screen` with a
 * `sticky` header rather than a nested scroll container - so Lenis attaches to
 * the document root (`root`) and no per-page wiring is needed.
 *
 * Accessibility: we bypass Lenis entirely when the user prefers reduced motion,
 * falling back to the browser's native scroll (mirrors the CSS guard in
 * globals.css, which only governs CSS transitions, not JS-driven scrolling).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        duration: 1.1, // seconds to settle - snappy but eased
        smoothWheel: true,
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  );
}
