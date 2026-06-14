"use client";

import { FONT_SIZE_OPTIONS } from "@/lib/templates";

/**
 * Dumb segmented font-size picker over FONT_SIZE_OPTIONS. `value === 0` means
 * "use the template's own size" (Default).
 */
export interface FontSizePickerProps {
  value: number;
  onChange: (px: number) => void;
}

export function FontSizePicker({ value, onChange }: FontSizePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FONT_SIZE_OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={`Font size ${o.label}`}
            onClick={() => onChange(o.value)}
            className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-brand bg-brand/10 text-white ring-1 ring-brand/40"
                : "border-ink-700 bg-ink-850 text-white/70 hover:border-ink-500"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
