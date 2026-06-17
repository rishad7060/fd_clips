"use client";

import { useEffect, useState } from "react";
import type { AspectRatio, ClipLength, ClipStyle, Genre } from "@/lib/types";

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
  clipCount: number;
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
        <h2 className="text-sm font-bold text-white">My templates</h2>
        {!naming && (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="rounded-md bg-ink-800 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-ink-700 hover:text-white"
          >
            + Save current
          </button>
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
            className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-ink-600 focus:border-brand focus:outline-none"
          />
          <button type="button" onClick={save} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-ink-950">Save</button>
          <button type="button" onClick={() => { setNaming(false); setName(""); }} className="px-2 text-sm text-ink-500 hover:text-white">Cancel</button>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-xs text-ink-500">
          No saved templates yet. Tune the config above and “Save current” to reuse it later.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <div key={t.id} className="group flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900/60 py-1 pl-3 pr-1">
              <button
                type="button"
                onClick={() => onApply(t.config)}
                title={`${t.config.genre} · ${t.config.aspectRatio} · ${t.config.clipLength}`}
                className="text-sm font-medium text-white/80 hover:text-white"
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label={`Delete ${t.name}`}
                className="grid h-5 w-5 place-items-center rounded text-ink-500 hover:bg-ink-700 hover:text-white"
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
