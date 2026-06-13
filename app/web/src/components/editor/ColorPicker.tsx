"use client";

import { useMemo } from "react";
import { STYLE_TEMPLATES } from "@/lib/templates";

/**
 * Dumb highlight-color picker: round swatch buttons. Default swatches are the
 * de-duped highlight colors from STYLE_TEMPLATES plus a few brand/preset hues.
 */
export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
}

export function ColorPicker({ value, onChange, swatches }: ColorPickerProps) {
  const colors = useMemo(() => {
    if (swatches && swatches.length) return swatches;
    const fromTemplates = STYLE_TEMPLATES.map((t) => t.style.highlight_color);
    const extras = ["#6d5efc", "#ff3b30", "#00e676"];
    return Array.from(new Set([...fromTemplates, ...extras]));
  }, [swatches]);

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => {
        const activeSwatch = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            aria-label={`Highlight color ${c}`}
            aria-pressed={activeSwatch}
            onClick={() => onChange(c)}
            style={{ background: c }}
            className={`h-8 w-8 rounded-full border border-white/20 transition ${
              activeSwatch
                ? "ring-2 ring-brand ring-offset-2 ring-offset-ink-900"
                : "hover:scale-105"
            }`}
          />
        );
      })}
    </div>
  );
}
