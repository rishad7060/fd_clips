---
name: design-system
description: The FocalDive Clips 2026 design system - tokens, components, and rules for a premium dark creator-tool UI. Use when building or redesigning any web UI in app/web.
when_to_use: UI, redesign, component, styling, Tailwind, dark theme, premium look
---

# FocalDive Clips - Design System (2026 premium dark)

Dark-mode-only creator tool. Purple brand accent over near-black. The goal is
"more polished than Opus Clip." Follow these exactly - consistency is what reads
premium.

## Tokens (in tailwind.config.ts - DO NOT reintroduce undefined classes)

**Surfaces (ink ramp - low=light text, high=dark surface):**
- `bg-ink-950` app background · `bg-ink-900` panel · `bg-ink-850` card · `bg-ink-800` hover/elevated
- Text: `text-ink-100` primary-light · `text-ink-300` secondary/label · `text-ink-400` muted/placeholder · `text-white` headings
- NEVER use `text-ink-200/300/400` expecting Tailwind defaults - they're now defined; use them, they work.

**Brand & state:** `brand` (#6d5efc) primary accent · `success`/`warning`/`danger` for states · `accent` (#FFE600) ONLY for high-score badges, always with an icon (never color-alone).

**Borders (the premium "tell"):** hairline `border-white/10` (default), `border-white/[0.08]` (large surfaces), `border-white/15` (interactive/hover). DO NOT use opaque `border-ink-700/600` for card edges.

**Elevation = lightness, not shadow.** Hover steps the surface UP (`hover:bg-ink-800`), never down. Add `shadow-rim` (top inner highlight) on cards. Use `shadow-glow` ONLY on the primary CTA + active/selected cards. `shadow-lift` on card hover.

**Radius:** `rounded-2xl` cards · `rounded-xl` buttons/inputs · `rounded-lg` badges/pills. Be consistent.

**Motion:** `ease-premium` (cubic-bezier(.22,1,.36,1)) for UI, `ease-spring` for toggles/checks. Durations: 150ms press, 200ms hover, 300ms overlays. `hover:-translate-y-0.5` lift on cards, `active:scale-95` press on buttons. Always gate behind `prefers-reduced-motion` (handled globally in globals.css).

## Typography rules
- Headings: weight **600-700** (NOT 800 - reads loud/cheap). `tracking-tight` (h2/h3), `tracking-tighter` + `text-balance` on display.
- Body: `text-sm` in-app (denser), `text-pretty` on paragraphs.
- Labels: `text-xs font-medium text-ink-300` (uppercase optional).
- Numbers (scores/durations/timestamps): `font-mono` + `tabular-nums` (or the `.nums` class) so digits don't jitter.
- Type scale (limit ~6): display text-4xl/5xl · h1 text-2xl/3xl · h2 text-lg/xl · h3 text-base · body text-sm · caption text-xs.

## Component rules (use the shared primitives in components/ui/)
- **One button system:** `<Button variant="primary">` = brand/white per the primitive (pick ONE app-wide - primary is brand-gradient with shadow-glow on hover); `secondary` = ink-800 surface; `ghost` = transparent. Always `active:scale-95`, focus-visible ring, loading state. Never hand-roll a 4th button style.
- **Cards:** `rounded-2xl border border-white/10 bg-ink-850 shadow-rim`. Hover (if interactive): `hover:border-white/15 hover:bg-ink-800 hover:-translate-y-0.5 transition`.
- **Select:** use the styled `<Select>` primitive - NEVER a raw `<select>` (OS chrome is the most off-brand element).
- **One "selected" affordance** everywhere (tabs/pickers/presets): `border-brand bg-brand/10 ring-1 ring-brand/40`. Don't invent per-component variants.
- **Skeletons over spinners** for grids/lists: shimmer sweep matching the final layout (zero layout shift).
- **Empty states (4 parts in order):** icon → headline → one subtext line → exactly one CTA.
- **Icons:** consistent stroke-1.8 line icons (lucide-style). Don't mix fill/stroke or stroke widths.

## Flow rules
- Config screen: sane "Auto" defaults, primary CTA works with zero config, surface cost/limits up front.
- Progress screen: determinate + NARRATED named stages + ETA + skeleton clip previews. Silence is the #1 failure.
- Gallery: dense grid sorted by score desc, hover preview, score badge with icon. Use PRODUCED count (0 possible).
- Editor: instant client-side edits; re-render only for reframe/bake; sticky preview.

## Accessibility floors
- Contrast: text 4.5:1, borders/icons/rings 3:1. Use `text-ink-100` not `/65` for primary body.
- `:focus-visible` ring ≥2px (global). Target size ≥24px. `aria-label` on icon buttons + the score. Don't rely on color alone.
