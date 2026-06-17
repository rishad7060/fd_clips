"use client";

/**
 * Segmented [ Hook | Subtitles ] switch selecting which layer's controls show
 * in the right panel. Dumb: parent owns the active value.
 */
export type EditorLayer = "hook" | "subtitle";

export interface LayerTabsProps {
  value: EditorLayer;
  onChange: (value: EditorLayer) => void;
}

const TABS: { id: EditorLayer; name: string }[] = [
  { id: "hook", name: "Hook" },
  { id: "subtitle", name: "Subtitles" },
];

export function LayerTabs({ value, onChange }: LayerTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Caption layer"
      className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-ink-950 p-1"
    >
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition duration-150 ease-premium ${
              active
                ? "border border-brand bg-brand/10 text-white ring-1 ring-brand/40"
                : "text-ink-300 hover:text-white"
            }`}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
