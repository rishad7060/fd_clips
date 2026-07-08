"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Download, FileCode, Sparkles, Upload } from "lucide-react";

/**
 * Free SRT ⟷ VTT converter - 100% client-side, no API. It detects the pasted /
 * uploaded format and converts between SubRip (.srt) and WebVTT (.vtt): swapping
 * the comma/dot in timestamps, adding or removing the WEBVTT header, and
 * dropping/keeping the numeric cue indices. Pure text transform in the browser.
 */

type Format = "srt" | "vtt";

/** srt uses "00:00:01,000", vtt uses "00:00:01.000". */
function detectFormat(text: string): Format {
  if (/^﻿?WEBVTT/m.test(text)) return "vtt";
  // vtt timestamps use a dot, srt uses a comma.
  if (/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/.test(text)) return "vtt";
  return "srt";
}

function toVtt(text: string): string {
  const body = text
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/^WEBVTT.*$/m, "")
    // comma → dot in timestamps
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

function toSrt(text: string): string {
  let body = text
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    // Strip the WEBVTT header line and any NOTE/STYLE blocks up to the first cue.
    .replace(/^WEBVTT.*(\n(?!\d).*)*\n+/m, "")
    // dot → comma in timestamps
    .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2")
    .trim();

  // Re-number cues so the output is valid SubRip (VTT often omits indices).
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());
  const rebuilt = blocks.map((block, i) => {
    const lines = block.split("\n");
    // Drop an existing leading numeric index if present.
    if (/^\d+$/.test(lines[0]?.trim())) lines.shift();
    return `${i + 1}\n${lines.join("\n")}`;
  });
  return rebuilt.join("\n\n") + "\n";
}

interface Output {
  from: Format;
  to: Format;
  text: string;
}

function convert(text: string): Output | null {
  if (!text.trim()) return null;
  const from = detectFormat(text);
  const to: Format = from === "srt" ? "vtt" : "srt";
  const converted = to === "vtt" ? toVtt(text) : toSrt(text);
  return { from, to, text: converted };
}

export function SubtitleConverter() {
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState("subtitles");
  const fileRef = useRef<HTMLInputElement>(null);

  const output = useMemo<Output | null>(() => (submitted ? convert(submitted) : null), [submitted]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setSubmitted(raw.trim());
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(/\.(srt|vtt)$/i, "") || "subtitles");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setRaw(text);
      setSubmitted(text.trim());
      setCopied(false);
    };
    reader.readAsText(file);
  }

  async function copyAll() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  function downloadFile() {
    if (!output) return;
    const blob = new Blob([output.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${output.to}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-lift backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink-400">
            <FileCode className="h-5 w-5 shrink-0" />
            <span className="text-xs font-medium">Paste your .srt or .vtt - we auto-detect and convert to the other</span>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
          >
            <Upload className="h-3.5 w-3.5" /> Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            onChange={onFile}
            className="hidden"
          />
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"1\n00:00:01,000 --> 00:00:04,000\nHello and welcome to the video."}
          aria-label="Subtitle content"
          rows={8}
          className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-3 font-mono text-xs text-white placeholder:text-ink-500 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-200 ease-premium hover:from-brand hover:to-brand-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Convert
        </button>
      </form>

      {!submitted && (
        <p className="mt-3 text-xs text-ink-500">
          Free · instant · nothing leaves your browser · convert both directions
        </p>
      )}

      {output && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-850 shadow-rim">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <p className="text-sm font-semibold text-white">
              Converted <span className="uppercase text-ink-400">{output.from}</span> →{" "}
              <span className="uppercase text-brand-300">{output.to}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 transition hover:border-white/20 hover:bg-ink-700 active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={downloadFile}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/15 px-3 py-1.5 text-xs font-medium text-brand-300 transition hover:bg-brand/25 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" /> Download .{output.to}
              </button>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 text-ink-200">
            {output.text}
          </pre>
        </div>
      )}
    </div>
  );
}
