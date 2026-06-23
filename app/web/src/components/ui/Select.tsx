"use client";

import type { SelectHTMLAttributes } from "react";

interface Option { value: string; label: string }

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Styled select - replaces raw <select> OS chrome (the most off-brand element).
 * Keeps a real <select> under the hood for accessibility + native mobile picker,
 * but skins it with the design-system surface + a chevron.
 */
export function Select({ options, value, onChange, className = "", ...props }: Props) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 pr-9 text-sm text-white transition hover:border-white/15 focus:border-brand focus:outline-none ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-900 text-white">
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
