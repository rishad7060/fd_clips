"use client";

import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Extra classes for the trigger (e.g. tighter padding). */
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * The app-wide select. A thin wrapper over the shadcn/Radix Select so the open
 * menu is fully on-brand (no native OS chrome - the most off-brand element) and
 * keyboard/ARIA-correct. Keeps the simple `{options, value, onChange}` API every
 * consumer already uses, so dropdowns stay consistent across the app.
 */
export function Select({
  options,
  value,
  onChange,
  className,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <ShadSelect value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadSelect>
  );
}
