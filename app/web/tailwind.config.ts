import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Shadcn semantic tokens (admin dashboard) ───────────────────────
        // Driven by CSS variables defined under `.admin-theme` in globals.css,
        // mapped to the ink/brand palette below. Additive - none of these names
        // are used by the existing creator UI, so it is unaffected.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Dark product surface palette. Low numbers = LIGHT text, high = dark
        // surfaces (an inverted ramp, since this is dark-mode-only). The 100–400
        // tiers were MISSING before - muted text classes (ink-400/300/200)
        // rendered with no color app-wide. Now complete.
        ink: {
          50: "#f4f6fb",   // near-white (rare)
          100: "#dfe4f0",  // primary-ish light text
          200: "#c2c9dc",  // strong secondary text
          300: "#9aa3bd",  // secondary text / labels
          400: "#727d9c",  // muted text / placeholders
          500: "#3a4561",  // faint / disabled text, hairline-ish
          600: "#283049",  // strong border / divider
          700: "#1c2236",  // border
          800: "#141a2b",  // elevated surface (hover)
          850: "#0f1422",  // card surface
          900: "#0b0f1a",  // panel surface
          950: "#070a12",  // app background
        },
        brand: {
          DEFAULT: "#905BF4",
          300: "#c3a8fa",
          400: "#ac82f7",
          500: "#905BF4",
          600: "#7a44e6",
          700: "#6232c2",
        },
        // Semantic state colors (were raw Tailwind defaults before - inconsistent).
        success: { DEFAULT: "#34d399", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981" },
        warning: { DEFAULT: "#fbbf24", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b" },
        danger: { DEFAULT: "#f87171", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444" },
        // High-score badge yellow (kept; was `accent` before shadcn took that
        // name). Use with an icon, never color-alone.
        highscore: "#FFE600",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Geist Sans/Mono loaded in layout.tsx as CSS vars; Inter is the fallback.
        sans: ["var(--font-geist)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Editorial grotesque for landing display/headlines (Bricolage Grotesque).
        display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(144,91,244,0.30), 0 8px 40px -8px rgba(144,91,244,0.45)",
        // Top-edge inner highlight - the glass-rim "lit from above" look on cards.
        rim: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
        card: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 1px 2px 0 rgba(0,0,0,0.3)",
        lift: "0 12px 32px -12px rgba(0,0,0,0.6)",
      },
      transitionTimingFunction: {
        // Premium ease-out (energetic) + spring overshoot for toggles/checks.
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.7)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        fadeIn: "fadeIn .25s cubic-bezier(0.22,1,0.36,1)",
        "fade-up": "fade-up .4s cubic-bezier(0.22,1,0.36,1) both",
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
