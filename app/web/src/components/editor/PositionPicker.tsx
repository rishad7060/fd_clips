"use client";

import { ALIGNMENT_OPTIONS } from "@/lib/templates";

/**
 * Dumb caption-position picker: 3 segmented buttons (Top / Center / Bottom)
 * driven by ALIGNMENT_OPTIONS. Active state reuses the page.tsx style-button
 * active ring.
 */
export interface PositionPickerProps {
  value: "top" | "center" | "bottom";
  onChange: (value: "top" | "center" | "bottom") => void;
}

export function PositionPicker({ value, onChange }: PositionPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ALIGNMENT_OPTIONS.map((o) => {
        const activeOpt = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={activeOpt}
            aria-label={`Caption position ${o.name}`}
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              activeOpt
                ? "border-brand bg-brand/10 text-white ring-1 ring-brand/40"
                : "border-ink-700 bg-ink-850 text-white/70 hover:border-ink-500"
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
