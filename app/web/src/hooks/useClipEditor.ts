"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Clip,
  ClipStyle,
  HookLayer,
  SubtitleLayer,
  SubtitleSegment,
  TranscriptWord,
} from "@/lib/types";
import { DEFAULT_STYLE, templateById } from "@/lib/templates";
import { formatDuration } from "@/lib/format";
import { api } from "@/lib/api";

/**
 * Single source of truth for the TWO-LAYER inline clip editor.
 *
 * TWO INDEPENDENT overlay layers live over the playing pre-cut <video>:
 *   1) HOOK  — the white-marker banner box (one editable line, near the top).
 *   2) SUBTITLE — per-word KARAOKE captions built from the REAL transcript
 *      words (api.getClipTranscript), grouped into segments, re-based to
 *      clip-relative seconds. The active word highlights as the video plays.
 * Editing either layer is pure client state (no network); the two never mix.
 *
 * TRIM MODEL (unchanged): `clip.final_url` is the PRE-CUT deliverable
 * (n_final.mp4), so the <video> currentTime runs 0..(clip.end-clip.start).
 * Trim is RELATIVE offsets INTO the video; video.duration (onLoadedMetadata)
 * is the authoritative out-bound. Absolute source timecodes (clip.start +
 * offset) are reconstructed ONLY for the optional server re-render payload.
 *
 * KARAOKE TIME SOURCE: the transcript words and segments are clip-relative,
 * which equals video-relative (clip_start = 0). `currentRel` (seconds into the
 * pre-cut video = video.currentTime) is updated in onTimeUpdate; the active
 * segment/word are derived from it. No extra mapping needed.
 */

type Position = "top" | "center" | "bottom";

const MIN_GAP = 0.2; // minimum trim window, seconds

// Segment grouping heuristics.
const SEG_GAP = 0.6; // split when inter-word gap exceeds this (seconds)
const SEG_MAX_WORDS = 7; // …or after this many words

/** Persisted shape — segment text overrides only (words reload from the API). */
interface PersistShape {
  trimStart: number;
  trimEnd: number;
  templateId: string;
  hook: HookLayer;
  subtitle: {
    show: boolean;
    highlightColor: string;
    position: Position;
    fontSize: number;
    segmentOverrides: Record<string, string>;
  };
}

function storageKey(clip: Clip): string {
  return `fd:clipedit:${clip.job_id}:${clip.rank}`;
}

function readPersisted(clip: Clip): Partial<PersistShape> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(clip));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistShape>;
  } catch {
    return null;
  }
}

function defaultHook(clip: Clip): HookLayer {
  return {
    text: clip.hook_title || clip.hook_line || "",
    show: true,
    color: "#ffffff",
    boxColor: "#000000",
    position: "top",
    fontSize: 0,
  };
}

/**
 * Group clip-relative transcript words into karaoke segments. Splits when the
 * inter-word gap exceeds SEG_GAP, the previous word ends a sentence (. ? !), or
 * the running segment reaches SEG_MAX_WORDS words. Each segment gets a stable
 * id so persisted text overrides re-apply on reload.
 */
function groupWords(words: TranscriptWord[]): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let bucket: TranscriptWord[] = [];

  const flush = () => {
    if (!bucket.length) return;
    const first = bucket[0]!;
    const last = bucket[bucket.length - 1]!;
    segments.push({
      id: `seg-${segments.length}`,
      startRel: first.start,
      endRel: last.end,
      words: bucket,
    });
    bucket = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const w = words[i]!;
    bucket.push(w);
    const next = words[i + 1];
    const endsSentence = /[.?!]["')\]]?$/.test(w.word.trim());
    const gap = next ? next.start - w.end : 0;
    if (
      !next ||
      bucket.length >= SEG_MAX_WORDS ||
      endsSentence ||
      gap > SEG_GAP
    ) {
      flush();
    }
  }
  flush();
  return segments;
}

export interface UseClipEditor {
  state: {
    trimStart: number;
    trimEnd: number;
    templateId: string;
    currentRel: number;
    hook: HookLayer;
    subtitle: SubtitleLayer;
  };
  actions: {
    setTrim: (start: number, end: number) => void;
    setTemplate: (id: string) => void;
    // Hook layer
    setHookText: (text: string) => void;
    setHookShow: (show: boolean) => void;
    setHookColor: (hex: string) => void;
    setHookBoxColor: (hex: string) => void;
    setHookPosition: (p: Position) => void;
    setHookFontSize: (px: number) => void;
    // Subtitle layer
    setSubtitleShow: (show: boolean) => void;
    setSubtitleHighlightColor: (hex: string) => void;
    setSubtitlePosition: (p: Position) => void;
    setSubtitleFontSize: (px: number) => void;
    setSegmentText: (id: string, text: string) => void;
    reset: () => void;
  };
  player: {
    playing: boolean;
    muted: boolean;
    progress: number; // 0..1 window-relative
    toggle: () => void;
    play: () => void;
    pause: () => void;
    toggleMute: () => void;
    seek: (frac: number) => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onLoadedMetadata: () => void;
    onTimeUpdate: () => void;
  };
  videoRef: React.RefObject<HTMLVideoElement>;
  derived: {
    clipDuration: number;
    duration: number;
    durationLabel: string;
    style: ClipStyle;
    absoluteStart: number;
    absoluteEnd: number;
    videoDuration: number;
    transcriptLoaded: boolean;
  };
}

export function useClipEditor(clip: Clip): UseClipEditor {
  const clipDuration = clip.end - clip.start;

  // Lazy init from localStorage (override defaults only when a stored value exists).
  const persisted = useMemo(() => readPersisted(clip), [clip]);

  const [trimStart, setTrimStart] = useState<number>(
    () => persisted?.trimStart ?? 0,
  );
  const [trimEnd, setTrimEnd] = useState<number>(
    () => persisted?.trimEnd ?? clipDuration,
  );
  const [templateId, setTemplateId] = useState<string>(
    () => persisted?.templateId ?? "hormozi",
  );

  // ---- Layer state --------------------------------------------------------
  const [hook, setHook] = useState<HookLayer>(() => {
    const base = defaultHook(clip);
    return persisted?.hook ? { ...base, ...persisted.hook } : base;
  });

  const [subtitle, setSubtitle] = useState<SubtitleLayer>(() => {
    const p = persisted?.subtitle;
    return {
      show: p?.show ?? true,
      highlightColor: p?.highlightColor ?? DEFAULT_STYLE.highlight_color,
      position: p?.position ?? "bottom",
      fontSize: p?.fontSize ?? 0,
      segments: [], // populated by the transcript fetch below
    };
  });

  // Persisted segment text overrides, re-applied once segments load.
  const overridesRef = useRef<Record<string, string>>(
    persisted?.subtitle?.segmentOverrides ?? {},
  );
  const [transcriptLoaded, setTranscriptLoaded] = useState(false);

  // Player sub-state.
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0..1, window-relative
  const [currentRel, setCurrentRel] = useState(0); // seconds into pre-cut video
  const [videoDuration, setVideoDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  // ---- Transcript fetch (ONCE on mount) -----------------------------------
  // All subsequent edits are pure client state. On failure leave segments=[]
  // (hook still editable); a render-time fallback supplies one editable line.
  useEffect(() => {
    let alive = true;
    api
      .getClipTranscript(clip.job_id, clip.rank)
      .then((t) => {
        if (!alive) return;
        const segs = groupWords(t.words).map((s) => {
          const ov = overridesRef.current[s.id];
          return ov !== undefined ? { ...s, textOverride: ov } : s;
        });
        setSubtitle((prev) => ({ ...prev, segments: segs }));
      })
      .catch(() => {
        // Graceful: no segments; the overlay falls back to a single line.
      })
      .finally(() => {
        if (alive) setTranscriptLoaded(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.job_id, clip.rank]);

  // ---- Derived ------------------------------------------------------------
  const duration = Math.max(0, trimEnd - trimStart);
  const durationLabel = formatDuration(duration);

  // The re-render style drives the SUBTITLE captions only — the hook is a
  // separate layer, so the hook's font size must NOT leak in here (that would
  // make the burned-in subtitles inherit the hook's size).
  const style: ClipStyle = useMemo(
    () => ({
      ...templateById(templateId).style,
      highlight_color: subtitle.highlightColor,
      alignment: subtitle.position,
      ...(subtitle.fontSize ? { font_size: subtitle.fontSize } : {}),
    }),
    [templateId, subtitle.highlightColor, subtitle.position, subtitle.fontSize],
  );

  const absoluteStart = clip.start + trimStart;
  const absoluteEnd = clip.start + trimEnd;

  // ---- Persistence --------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const segmentOverrides: Record<string, string> = {};
      for (const s of subtitle.segments) {
        if (s.textOverride !== undefined) segmentOverrides[s.id] = s.textOverride;
      }
      // Keep overridesRef in sync so a re-fetch re-applies the latest edits.
      overridesRef.current = segmentOverrides;
      const payload: PersistShape = {
        trimStart,
        trimEnd,
        templateId,
        hook,
        subtitle: {
          show: subtitle.show,
          highlightColor: subtitle.highlightColor,
          position: subtitle.position,
          fontSize: subtitle.fontSize,
          segmentOverrides,
        },
      };
      window.localStorage.setItem(storageKey(clip), JSON.stringify(payload));
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [clip, trimStart, trimEnd, templateId, hook, subtitle]);

  // ---- Actions: trim & template ------------------------------------------
  const setTrim = useCallback(
    (start: number, end: number) => {
      const vd = videoDuration > 0 ? videoDuration : trimEndRef.current;
      let s = start;
      let e = end;
      e = Math.min(Math.max(e, MIN_GAP), vd || e);
      s = Math.min(Math.max(0, s), Math.max(0, e - MIN_GAP));
      e = Math.max(e, s + MIN_GAP);
      if (vd) e = Math.min(e, vd);
      setTrimStart(s);
      setTrimEnd(e);
    },
    [videoDuration],
  );

  // Templates describe the karaoke SUBTITLE layer — they tweak its highlight
  // color + position. They do NOT touch the hook box.
  const setTemplate = useCallback((id: string) => {
    setTemplateId(id);
    const t = templateById(id);
    setSubtitle((prev) => ({
      ...prev,
      highlightColor: t.style.highlight_color,
      position: t.style.alignment ?? "bottom",
    }));
  }, []);

  // ---- Actions: hook layer ------------------------------------------------
  const setHookText = useCallback(
    (text: string) => setHook((p) => ({ ...p, text })),
    [],
  );
  const setHookShow = useCallback(
    (show: boolean) => setHook((p) => ({ ...p, show })),
    [],
  );
  const setHookColor = useCallback(
    (color: string) => setHook((p) => ({ ...p, color })),
    [],
  );
  const setHookBoxColor = useCallback(
    (boxColor: string) => setHook((p) => ({ ...p, boxColor })),
    [],
  );
  const setHookPosition = useCallback(
    (position: Position) => setHook((p) => ({ ...p, position })),
    [],
  );
  const setHookFontSize = useCallback(
    (fontSize: number) => setHook((p) => ({ ...p, fontSize })),
    [],
  );

  // ---- Actions: subtitle layer --------------------------------------------
  const setSubtitleShow = useCallback(
    (show: boolean) => setSubtitle((p) => ({ ...p, show })),
    [],
  );
  const setSubtitleHighlightColor = useCallback(
    (highlightColor: string) => setSubtitle((p) => ({ ...p, highlightColor })),
    [],
  );
  const setSubtitlePosition = useCallback(
    (position: Position) => setSubtitle((p) => ({ ...p, position })),
    [],
  );
  const setSubtitleFontSize = useCallback(
    (fontSize: number) => setSubtitle((p) => ({ ...p, fontSize })),
    [],
  );
  const setSegmentText = useCallback((id: string, text: string) => {
    setSubtitle((p) => ({
      ...p,
      segments: p.segments.map((s) =>
        s.id === id
          ? { ...s, textOverride: text.length ? text : undefined }
          : s,
      ),
    }));
  }, []);

  const reset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(videoDuration || clipDuration);
    setTemplateId("hormozi");
    setHook(defaultHook(clip));
    overridesRef.current = {};
    setSubtitle((prev) => ({
      show: true,
      highlightColor: DEFAULT_STYLE.highlight_color,
      position: "bottom",
      fontSize: 0,
      // Drop any text overrides but keep the loaded word timings.
      segments: prev.segments.map(({ textOverride: _drop, ...s }) => s),
    }));
  }, [clip, clipDuration, videoDuration]);

  // ---- Player -------------------------------------------------------------
  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v || !clip.final_url) return;
    if (
      v.duration &&
      isFinite(v.duration) &&
      (v.currentTime >= trimEndRef.current || v.currentTime < trimStartRef.current)
    ) {
      v.currentTime = trimStartRef.current;
    }
    void v.play().catch(() => {});
  }, [clip.final_url]);

  const pause = useCallback(() => {
    const v = videoRef.current;
    if (v) v.pause();
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v || !clip.final_url) return;
    if (v.paused) play();
    else v.pause();
  }, [clip.final_url, play]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    setMuted((prev) => {
      const next = !prev;
      if (v) v.muted = next;
      return next;
    });
  }, []);

  const seek = useCallback((frac: number) => {
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    const s = trimStartRef.current;
    const e = trimEndRef.current;
    const clamped = Math.min(1, Math.max(0, frac));
    v.currentTime = s + clamped * (e - s);
    setProgress(clamped);
    setCurrentRel(v.currentTime);
  }, []);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);

  const onEnded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = trimStartRef.current;
    setProgress(0);
    setCurrentRel(v.currentTime);
    void v.play().catch(() => {});
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const vd = v.duration;
    if (!isFinite(vd) || vd <= 0) return;
    setVideoDuration(vd);
    setTrimEnd((prev) => {
      if (prev <= 0) return vd;
      return Math.min(prev, vd);
    });
    setTrimStart((prev) => Math.min(Math.max(0, prev), Math.max(0, vd - MIN_GAP)));
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    const s = trimStartRef.current;
    const e = trimEndRef.current;
    if (v.currentTime >= e || v.currentTime < s) {
      v.currentTime = s;
    }
    const win = Math.max(0.001, e - s);
    setProgress(Math.min(1, Math.max(0, (v.currentTime - s) / win)));
    // Karaoke time source: clip-relative == video-relative (clip_start=0).
    setCurrentRel(v.currentTime);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
      setProgress(0);
      setCurrentRel(v.currentTime);
    } else {
      const win = Math.max(0.001, trimEnd - trimStart);
      setProgress(Math.min(1, Math.max(0, (v.currentTime - trimStart) / win)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimStart, trimEnd]);

  return {
    state: {
      trimStart,
      trimEnd,
      templateId,
      currentRel,
      hook,
      subtitle,
    },
    actions: {
      setTrim,
      setTemplate,
      setHookText,
      setHookShow,
      setHookColor,
      setHookBoxColor,
      setHookPosition,
      setHookFontSize,
      setSubtitleShow,
      setSubtitleHighlightColor,
      setSubtitlePosition,
      setSubtitleFontSize,
      setSegmentText,
      reset,
    },
    player: {
      playing,
      muted,
      progress,
      toggle,
      play,
      pause,
      toggleMute,
      seek,
      onPlay,
      onPause,
      onEnded,
      onLoadedMetadata,
      onTimeUpdate,
    },
    videoRef,
    derived: {
      clipDuration,
      duration,
      durationLabel,
      style,
      absoluteStart,
      absoluteEnd,
      videoDuration,
      transcriptLoaded,
    },
  };
}
