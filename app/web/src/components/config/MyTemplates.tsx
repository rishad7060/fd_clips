"use client";

import { useEffect, useState } from "react";
import type { AspectRatio, ClipLength, ClipStyle, Genre } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/Card";

/**
 * A reusable saved clip-generation config ("My templates", Opus-style). MVP:
 * persisted in localStorage so it survives reloads without backend work. Each
 * template captures the full config (aspect / length / genre / auto-hook /
 * caption style + placement / clip count) so one click reproduces a setup.
 */
export interface SavedConfig {
  aspectRatio: AspectRatio;
  clipLength: ClipLength;
  genre: Genre;
  autoHook: boolean;
  templateId: string;
  alignment: NonNullable<ClipStyle["alignment"]>;
}

interface NamedTemplate {
  id: string;
  name: string;
  config: SavedConfig;
}

const KEY = "fd:myTemplates";

function load(): NamedTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NamedTemplate[]) : [];
  } catch {
    return [];
  }
}
function persist(list: NamedTemplate[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {/* quota / private mode — non-fatal */}
}

export function MyTemplates({ current, onApply }: {
  current: SavedConfig;
  onApply: (c: SavedConfig) => void;
}) {
  const [templates, setTemplates] = useState<NamedTemplate[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { setTemplates(load()); }, []);

  function save() {
    const n = name.trim() || `Template ${templates.length + 1}`;
    // Deterministic-ish id without Date.now() concerns in render.
    const id = n.toLowerCase().replace(/\s+/g, "-") + "-" + templates.length;
    const next = [...templates.filter((t) => t.id !== id), { id, name: n, config: current }];
    setTemplates(next);
    persist(next);
    setNaming(false);
    setName("");
  }
  function remove(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    persist(next);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>My templates</SectionTitle>
        {!naming && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setNaming(true)}>
            + Save current
          </Button>
        )}
      </div>

      {naming && (
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Template name (e.g. Podcast 9:16)"
            className="flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white transition placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
          />
          <Button type="button" variant="primary" size="sm" onClick={save}>Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setNaming(false); setName(""); }}>Cancel</Button>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-xs text-ink-400">
          No saved templates yet. Tune the config above and “Save current” to reuse it later.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <div key={t.id} className="group flex items-center gap-1 rounded-lg border border-white/10 bg-ink-850 py-1 pl-3 pr-1 transition hover:border-white/15">
              <button
                type="button"
                onClick={() => onApply(t.config)}
                title={`${t.config.genre} · ${t.config.aspectRatio} · ${t.config.clipLength}`}
                className="text-sm font-medium text-ink-200 hover:text-white"
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label={`Delete ${t.name}`}
                className="grid h-5 w-5 place-items-center rounded text-ink-400 hover:bg-ink-700 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
