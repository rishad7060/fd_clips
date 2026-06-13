"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clip, ClipStyle } from "@/lib/types";
import { DEFAULT_STYLE, templateById } from "@/lib/templates";
import { formatDuration } from "@/lib/format";

/**
 * Single source of truth for the inline clip editor.
 *
 * IMPORTANT trim model: `clip.final_url` is the PRE-CUT deliverable
 * (n_final.mp4), so the <video> element's currentTime runs 0..(clip.end-clip.start).
 * Trim is therefore expressed as RELATIVE offsets INTO the video (0..video.duration),
 * NOT as absolute source timecodes. video.duration (from onLoadedMetadata) is the
 * authoritative out-bound — you cannot extend a pre-cut file past its own frames.
 *
 * Absolute source timecodes (clip.start + offset) are reconstructed ONLY for the
 * optional server re-render payload.
 */

type Position = "top" | "center" | "bottom";

const MIN_GAP = 0.2; // minimum trim window, seconds

interface PersistShape {
  trimStart: number;
  trimEnd: number;
  hookText: string;
  highlightColor: string;
  position: Position;
  templateId: string;
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

export interface UseClipEditor {
  state: {
    trimStart: number;
    trimEnd: number;
    hookText: string;
    highlightColor: string;
    position: Position;
    templateId: string;
  };
  actions: {
    setTrim: (start: number, end: number) => void;
    setHookText: (text: string) => void;
    setColor: (hex: string) => void;
    setPosition: (p: Position) => void;
    setTemplate: (id: string) => void;
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
  const [hookText, setHookTextState] = useState<string>(
    () =>
      persisted?.hookText ??
      clip.caption_lines[0]?.text ??
      clip.hook_title ??
      clip.hook_line ??
      "",
  );
  const [highlightColor, setHighlightColor] = useState<string>(
    () => persisted?.highlightColor ?? DEFAULT_STYLE.highlight_color,
  );
  const [position, setPositionState] = useState<Position>(
    () => persisted?.position ?? DEFAULT_STYLE.alignment ?? "bottom",
  );
  const [templateId, setTemplateId] = useState<string>(
    () => persisted?.templateId ?? "hormozi",
  );

  // Player sub-state (mirrors ClipCard).
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0..1, window-relative
  const [videoDuration, setVideoDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep latest trim bounds in refs so the timeupdate/seek callbacks read fresh
  // values without re-binding the <video> event handlers.
  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  // ---- Derived ------------------------------------------------------------
  const duration = Math.max(0, trimEnd - trimStart);
  const durationLabel = formatDuration(duration);

  const style: ClipStyle = useMemo(
    () => ({
      ...templateById(templateId).style,
      highlight_color: highlightColor,
      alignment: position,
    }),
    [templateId, highlightColor, position],
  );

  const absoluteStart = clip.start + trimStart;
  const absoluteEnd = clip.start + trimEnd;

  // ---- Persistence --------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload: PersistShape = {
        trimStart,
        trimEnd,
        hookText,
        highlightColor,
        position,
        templateId,
      };
      window.localStorage.setItem(storageKey(clip), JSON.stringify(payload));
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [clip, trimStart, trimEnd, hookText, highlightColor, position, templateId]);

  // ---- Actions ------------------------------------------------------------
  const setTrim = useCallback(
    (start: number, end: number) => {
      const vd = videoDuration > 0 ? videoDuration : trimEndRef.current;
      let s = start;
      let e = end;
      // Clamp s in [0, e-MIN_GAP], e in [s+MIN_GAP, videoDuration].
      e = Math.min(Math.max(e, MIN_GAP), vd || e);
      s = Math.min(Math.max(0, s), Math.max(0, e - MIN_GAP));
      e = Math.max(e, s + MIN_GAP);
      if (vd) e = Math.min(e, vd);
      setTrimStart(s);
      setTrimEnd(e);
    },
    [videoDuration],
  );

  const setHookText = useCallback((text: string) => setHookTextState(text), []);
  const setColor = useCallback((hex: string) => setHighlightColor(hex), []);
  const setPosition = useCallback((p: Position) => setPositionState(p), []);

  const setTemplate = useCallback((id: string) => {
    setTemplateId(id);
    const t = templateById(id);
    setHighlightColor(t.style.highlight_color);
    setPositionState(t.style.alignment ?? "bottom");
  }, []);

  const reset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(videoDuration || clipDuration);
    setHookTextState(
      clip.caption_lines[0]?.text ??
        clip.hook_title ??
        clip.hook_line ??
        "",
    );
    setHighlightColor(DEFAULT_STYLE.highlight_color);
    setPositionState(DEFAULT_STYLE.alignment ?? "bottom");
    setTemplateId("hormozi");
  }, [clip, clipDuration, videoDuration]);

  // ---- Player -------------------------------------------------------------
  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v || !clip.final_url) return;
    // Seek into the window if currentTime is outside [trimStart, trimEnd).
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
  }, []);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);

  // At natural end-of-file the browser fires 'ended' before a reliable
  // timeupdate, so the timeupdate loop guard can't catch it. Loop explicitly:
  // snap back to the in-point and keep playing. Covers the default untrimmed
  // window (trimEnd === videoDuration) where EOF == out-point.
  const onEnded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = trimStartRef.current;
    setProgress(0);
    void v.play().catch(() => {});
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const vd = v.duration;
    if (!isFinite(vd) || vd <= 0) return;
    setVideoDuration(vd);
    // Clamp trimEnd to the authoritative out-bound; if the clip math gave 0
    // (or persisted nothing usable), adopt the full video duration.
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
    // Guard owns looping: snap back to the in-point when leaving the window.
    if (v.currentTime >= e || v.currentTime < s) {
      v.currentTime = s;
    }
    const win = Math.max(0.001, e - s);
    setProgress(Math.min(1, Math.max(0, (v.currentTime - s) / win)));
  }, []);

  // Moving either handle should be visible instantly: if the playhead falls
  // outside the new [in, out) window, snap it back to the in-point and update
  // the progress readout (covers the paused case where timeupdate won't fire).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
      setProgress(0);
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
      hookText,
      highlightColor,
      position,
      templateId,
    },
    actions: { setTrim, setHookText, setColor, setPosition, setTemplate, reset },
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
    },
  };
}
