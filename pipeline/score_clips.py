"""Stage 3 — Clip scoring (the core IP).

Reads ``workspace/{job_id}/transcript.json`` and produces
``workspace/{job_id}/clips.json`` conforming to CONTRACTS.md §3:
{job_id, model, candidates[]} where each candidate is
{start, end, hook_line, virality_score, reason, suggested_title}, sorted by
virality_score desc and deduped (overlap > 50% drops the lower score).

Real branches (MOCK_MODE=false), dispatched on settings.resolved_scoring_provider():
    * 'openai': send the transcript + prompts/virality_rubric.txt to GPT-4o-mini
      in JSON mode (response_format={"type": "json_object"}) so parsing never fails.
    * 'gemini': same prompt (rubric as system instruction + compact transcript)
      via the google-genai SDK with response_mime_type="application/json" (free tier).

Mock branch (MOCK_MODE=true, offline):
    * A deterministic heuristic scorer over the transcript. It builds candidate
      windows on sentence/segment boundaries (20-90s), scores each window with a
      keyword/heuristic rubric, dedupes overlaps > 50%, and returns the same JSON
      shape with model="mock-heuristic-v1". Deterministic: same transcript ->
      same output every run.

Standalone:
    python pipeline/score_clips.py                 # score the demo job transcript
    python pipeline/score_clips.py --job-id X --top 5
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore

MIN_CLIP_SEC = 15.0   # research: 15-30s = highest retention; allow down to 15s
MAX_CLIP_SEC = 90.0
# Cross-platform sweet spot (full length bonus inside this band).
IDEAL_MIN_SEC = 30.0
IDEAL_MAX_SEC = 60.0
MOCK_MODEL = "mock-heuristic-v1"

# Penalty applied to a clip the LLM couldn't give a payoff_line for (an
# "orphaned hook" — the #1 reason a clip fails). Heavy so these drop in ranking.
NO_PAYOFF_PENALTY = 25

# Heuristic keyword banks for the deterministic mock scorer.
_HOOK_WORDS = {
    "why", "how", "what", "never", "always", "secret", "truth", "really",
    "wrong", "nobody", "everybody", "number one", "reason", "killer",
}
_EMOTION_WORDS = {
    "brutal", "savings", "failed", "fail", "love", "obsessed", "pain",
    "waste", "wasted", "spent", "honest", "important", "win",
}
_QUOTABLE_MARKERS = {"not the", "fall in love", "the real", "just", "not their"}
_PRACTICAL_WORDS = {"talk", "before", "write", "code", "find", "ten", "customers"}
_CONTROVERSY_WORDS = {"wrong", "isn't", "killer", "nobody", "myth"}


def score_clips(job_id: str, top_n: Optional[int] = None) -> dict[str, Any]:
    """Score clip candidates for a job and write ``clips.json``."""
    settings = get_settings()
    ws = settings.workspace(job_id)
    transcript = json.loads((ws / "transcript.json").read_text(encoding="utf-8"))

    provider = settings.resolved_scoring_provider()
    if provider == "gemini":
        result = _score_gemini(job_id, transcript)
    elif provider == "openai":
        result = _score_real(job_id, transcript)
    else:  # "mock"
        result = _score_mock(job_id, transcript)

    # Normalize new schema fields + apply the "complete idea" adjustments:
    # penalize orphaned hooks (no payoff) and reward the 30-60s length sweet spot.
    result["candidates"] = [_normalize_candidate(c) for c in result["candidates"]]
    _apply_completeness_and_length(result["candidates"])

    # Blend in the YouTube "most replayed" heatmap when the source has one, so
    # clips over the most-rewatched moments rank higher (real audience signal,
    # not just the transcript rubric). No-op when there's no heatmap.
    _apply_replay_blend(ws, result)

    # Dedupe overlapping candidates, then optionally trim to top_n.
    result["candidates"] = _dedupe_overlaps(result["candidates"])
    result["candidates"].sort(key=lambda c: c["virality_score"], reverse=True)
    if top_n is not None:
        result["candidates"] = result["candidates"][:top_n]

    (ws / "clips.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return result


# ── "Most replayed" heatmap blend ───────────────────────────────────────────
# Weight of the real replay signal vs the rubric score when a heatmap exists.
# 0.35 = replay meaningfully reorders ties/close calls without overriding a
# clearly-better-written clip the audience hadn't reached yet.
REPLAY_WEIGHT = 0.35


def _clip_replay_score(start: float, end: float, heatmap: list[dict]) -> Optional[float]:
    """Mean replay intensity (0..1) over [start, end], or None if no overlap.

    Each heatmap segment is {start_time, end_time, value(0..1)}. We average the
    segment values weighted by how much of the clip each one covers, so a clip
    spanning a hot peak and a cold trough gets a fair middle score.
    """
    if not heatmap:
        return None
    total_w = 0.0
    acc = 0.0
    for seg in heatmap:
        s, e, v = seg["start_time"], seg["end_time"], seg["value"]
        overlap = max(0.0, min(end, e) - max(start, s))
        if overlap > 0:
            acc += v * overlap
            total_w += overlap
    if total_w <= 0:
        return None
    return acc / total_w


def _apply_replay_blend(ws: "Path", result: dict[str, Any]) -> None:
    """Blend the source's replay heatmap into each candidate's virality_score.

    Reads ``source.meta.json`` for the heatmap (written by ingest). For each
    candidate, computes its replay score, normalizes the set to 0..100, and sets
    ``virality_score = (1-W)*rubric + W*replay``. Also records ``replay_score``
    (0..100) and a short note per candidate. No-op (and unchanged scores) when
    the source has no heatmap — so non-YouTube/new videos behave exactly as before.
    """
    meta_file = ws / "source.meta.json"
    if not meta_file.exists():
        return
    try:
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return
    heatmap = meta.get("heatmap") or []
    candidates = result.get("candidates", [])
    if not heatmap or not candidates:
        return

    # Raw replay score per candidate (None where it falls outside the heatmap).
    raw = [_clip_replay_score(float(c["start"]), float(c["end"]), heatmap)
           for c in candidates]
    have = [r for r in raw if r is not None]
    if not have:
        return
    lo, hi = min(have), max(have)
    span = (hi - lo) or 1.0

    blended = 0
    for c, r in zip(candidates, raw):
        rubric = float(c["virality_score"])
        if r is None:
            c["replay_score"] = None
            continue
        # Normalize this video's replay values to 0..100 (relative within the video).
        replay100 = round((r - lo) / span * 100.0, 1)
        c["replay_score"] = replay100
        new_score = (1.0 - REPLAY_WEIGHT) * rubric + REPLAY_WEIGHT * replay100
        c["virality_score"] = int(round(new_score))
        c["reason"] = (
            f"{c.get('reason', '').rstrip('.')}. "
            f"Replay signal: {replay100:.0f}/100 of this video's most-rewatched range."
        ).strip()
        blended += 1
    result["replay_blended"] = blended
    print(f"  [score] blended 'most replayed' heatmap into {blended} candidate(s) "
          f"(weight {REPLAY_WEIGHT:.0%}).")


# ── Completeness (payoff) + length-tier scoring ─────────────────────────────

def _normalize_candidate(c: dict[str, Any]) -> dict[str, Any]:
    """Ensure every candidate carries the new schema fields with safe defaults.

    LLM scorers should emit payoff_line/hook_type/hashtags/description; the mock
    scorer and any model that omits them get sensible defaults so clips.json and
    downstream stages always see a consistent shape.
    """
    c.setdefault("payoff_line", "")
    c.setdefault("hook_type", "")
    c.setdefault("hashtags", [])
    c.setdefault("description", "")
    # Coerce hashtags to a clean list of strings without leading '#'.
    if isinstance(c.get("hashtags"), str):
        c["hashtags"] = [t.strip() for t in c["hashtags"].split() if t.strip()]
    c["hashtags"] = [str(t).lstrip("#").strip() for t in (c.get("hashtags") or [])][:5]

    # hook_title = the SHORT on-screen banner. Prefer the LLM's; else derive a
    # punchy fallback from suggested_title or the first ~6 words of hook_line,
    # capped so the gallery banner never overflows.
    title = str(c.get("hook_title") or "").strip()
    if not title:
        title = str(c.get("suggested_title") or "").strip()
    if not title:
        words = str(c.get("hook_line") or "").split()
        title = " ".join(words[:6])
    c["hook_title"] = _shorten_hook(title)
    return c


def _shorten_hook(text: str, *, max_chars: int = 42, max_words: int = 7) -> str:
    """Trim a hook to a short, banner-safe string (word-boundary, no trailing
    punctuation noise). Keeps a '?' if the hook is a question."""
    t = " ".join(text.split())
    is_q = t.rstrip().endswith("?")
    words = t.split()
    if len(words) > max_words:
        t = " ".join(words[:max_words])
    if len(t) > max_chars:
        t = t[:max_chars].rsplit(" ", 1)[0]
    t = t.rstrip(" ,.;:—-")
    if is_q and not t.endswith("?"):
        t += "?"
    return t


def _length_multiplier(duration: float) -> float:
    """Score multiplier rewarding the 30-60s sweet spot, soft-penalizing outside.

    30-60s = 1.0 (ideal); 15-30s = 0.95 (good if self-contained); 60-90s decays
    ~0.04 per extra 10s; outside 15-90s = 0.6 (will usually be dropped anyway).
    """
    if IDEAL_MIN_SEC <= duration <= IDEAL_MAX_SEC:
        return 1.0
    if MIN_CLIP_SEC <= duration < IDEAL_MIN_SEC:
        return 0.95
    if IDEAL_MAX_SEC < duration <= MAX_CLIP_SEC:
        return max(0.8, 1.0 - 0.04 * ((duration - IDEAL_MAX_SEC) / 10.0))
    return 0.6


def _apply_completeness_and_length(candidates: list[dict[str, Any]]) -> None:
    """Adjust virality_score for payoff completeness and length, in place.

    - Orphaned-hook penalty: a clip whose hook is a question/open-loop but has no
      ``payoff_line`` inside it loses NO_PAYOFF_PENALTY points (the #1 failure
      mode — 'cuts the question, not the answer').
    - Length tier: multiply by _length_multiplier so 30-60s clips rank above
      equally-good clips that are too short or too long.
    """
    open_loop_types = {"question", "curiosity_gap", "numbered_promise", "bold_claim"}
    for c in candidates:
        score = float(c.get("virality_score", 0))
        hook_type = str(c.get("hook_type", "")).lower()
        hook = str(c.get("hook_line", "")).strip()
        payoff = str(c.get("payoff_line", "")).strip()
        looks_open = hook_type in open_loop_types or hook.endswith("?")
        # Penalize an open-loop hook with no resolving line inside the clip.
        if looks_open and not payoff:
            score -= NO_PAYOFF_PENALTY
            c["reason"] = (
                f"{str(c.get('reason','')).rstrip('.')}. "
                "Penalized: hook opens a loop with no payoff line inside the clip."
            ).strip()
        duration = float(c["end"]) - float(c["start"])
        score *= _length_multiplier(duration)
        c["virality_score"] = max(0, min(100, int(round(score))))


# ── Dedup / overlap helpers (shared by mock + real) ─────────────────────────

def _overlap_fraction(a: dict, b: dict) -> float:
    """Overlap as a fraction of the SHORTER clip's duration (0..1)."""
    inter = max(0.0, min(a["end"], b["end"]) - max(a["start"], b["start"]))
    shorter = min(a["end"] - a["start"], b["end"] - b["start"])
    return inter / shorter if shorter > 0 else 0.0


def _dedupe_overlaps(candidates: list[dict], threshold: float = 0.6) -> list[dict]:
    """Dedupe candidates overlapping > ``threshold`` of the shorter clip.

    Greedy by score (highest first): keep a candidate only if it doesn't overlap
    any ALREADY-kept clip by more than ``threshold``. This preserves every
    *distinct* viral moment instead of collapsing a cluster of near-duplicate
    windows over one moment to a single survivor (the old left-to-right sweep
    compared only to the last kept clip and chain-collapsed 8 candidates → 3).
    Threshold raised to 0.6 so two clips over the same hot region that genuinely
    cover different spans both survive.
    """
    if not candidates:
        return []
    # Highest score first → a clip is only dropped by a strictly better-or-equal
    # overlapping one, so the best version of each moment is the one kept.
    ordered = sorted(
        candidates,
        key=lambda c: (-c["virality_score"], c["start"], c["end"] - c["start"]),
    )
    kept: list[dict] = []
    for cand in ordered:
        if any(_overlap_fraction(cand, k) > threshold for k in kept):
            continue
        kept.append(cand)
    return kept


# ── Mock heuristic scorer ────────────────────────────────────────────────────

def _first_sentence(text: str) -> str:
    """Return the first sentence of a block of text (the hook line)."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return parts[0].strip() if parts else text.strip()


def _last_sentence(text: str) -> str:
    """Return the last sentence of a block of text (the payoff line)."""
    parts = [p for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]
    return parts[-1].strip() if parts else text.strip()


def _title_from(text: str) -> str:
    """Derive a short shareable title from the hook text."""
    sentence = _first_sentence(text).rstrip(".!?")
    words = sentence.split()
    title = " ".join(words[:8])
    return title[:60]


def _score_window(text: str, duration: float) -> tuple[int, str]:
    """Heuristic 0-100 score for a window plus a rubric-grounded reason."""
    lower = text.lower()

    def count(bank: set[str]) -> int:
        return sum(1 for kw in bank if kw in lower)

    hook = min(25, 6 + count(_HOOK_WORDS) * 5)
    emotion = min(20, count(_EMOTION_WORDS) * 5)
    quotable = min(20, count(_QUOTABLE_MARKERS) * 7)
    payoff = 15 if re.search(r"[.!?]\s*$", text.strip()) else 8
    practical = min(10, count(_PRACTICAL_WORDS) * 3)
    controversy = min(10, count(_CONTROVERSY_WORDS) * 4)

    # Length sweet-spot bonus: clips near 30-60s read best.
    if 28.0 <= duration <= 62.0:
        length_bonus = 5
    elif duration <= MAX_CLIP_SEC:
        length_bonus = 2
    else:
        length_bonus = 0

    raw = hook + emotion + quotable + payoff + practical + controversy + length_bonus
    score = max(0, min(100, raw))

    drivers = []
    if hook >= 15:
        drivers.append("strong scroll-stopping hook")
    if emotion >= 10:
        drivers.append("clear emotional peak")
    if quotable >= 7:
        drivers.append("tweetable quotable line")
    if practical >= 6:
        drivers.append("concrete actionable takeaway")
    if controversy >= 8:
        drivers.append("debate-worthy contrarian take")
    if not drivers:
        drivers.append("complete self-contained thought")
    reason = (
        f"Heuristic rubric match: {', '.join(drivers)}. "
        f"Sentence-bounded clip of {duration:.0f}s."
    )
    return score, reason


def _adaptive_min_clip(content_duration: float, target_count: int = 10) -> float:
    """Pick a per-source minimum clip length.

    Clips are always complete, sentence-bounded thoughts. On a long podcast the
    natural minimum is the rubric's 20s. On a short source, forcing 20s would
    yield only 2-3 non-overlapping clips, so we relax the floor to roughly tile
    the content into ``target_count`` thoughts (down to an 8s hard floor for a
    coherent thought). The maximum is always the rubric's 90s.

    This keeps mock output the same *shape* as a real GPT-4o-mini run while
    guaranteeing a usable candidate pool regardless of source length.
    """
    if content_duration <= 0:
        return MIN_CLIP_SEC
    tiled = content_duration / max(1, target_count)
    return float(max(8.0, min(MIN_CLIP_SEC, tiled)))


def _score_mock(job_id: str, transcript: dict[str, Any]) -> dict[str, Any]:
    """Deterministic heuristic scorer producing CONTRACTS.md §3 candidates.

    Builds candidate windows over consecutive segments (each segment starts/ends
    on a sentence boundary). Windows clear an adaptive minimum length (20s on
    long sources, relaxed on short ones) and never exceed MAX_CLIP_SEC (90s).
    The deduper then drops any pair overlapping > 50%, keeping the higher score.
    """
    segments = transcript.get("segments", [])
    candidates: list[dict[str, Any]] = []

    n = len(segments)
    content_duration = float(segments[-1]["end"]) if segments else 0.0
    min_clip = _adaptive_min_clip(content_duration)

    # Anchor one tight clip per starting segment: grow it segment-by-segment
    # until it first clears the adaptive minimum (a complete, sentence-bounded
    # thought), emit it, then move to the next anchor. This yields a rich 8-12
    # candidate pool of staggered windows that the dedupe sweep thins to a
    # well-spaced selection.
    for i in range(n):
        text_parts: list[str] = []
        for j in range(i, n):
            seg_i = segments[i]
            seg_j = segments[j]
            text_parts.append(seg_j["text"].strip())
            start = float(seg_i["start"])
            end = float(seg_j["end"])
            duration = end - start
            if duration < min_clip:
                continue
            if duration > MAX_CLIP_SEC:
                break  # further j only makes it longer

            text = " ".join(text_parts)
            score, reason = _score_window(text, duration)
            hook = _first_sentence(seg_i["text"])
            # The window's last full sentence stands in as the payoff so the
            # mock path isn't penalized by the orphaned-hook check; it does
            # genuinely contain the segment's resolution.
            payoff = _last_sentence(seg_j["text"])
            candidates.append(
                {
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "hook_line": hook,
                    "hook_title": _shorten_hook(_title_from(seg_i["text"])),
                    "payoff_line": payoff,
                    "hook_type": "question" if hook.rstrip().endswith("?") else "story",
                    "virality_score": score,
                    "reason": reason,
                    "suggested_title": _title_from(seg_i["text"]),
                    "hashtags": [],
                    "description": "",
                }
            )
            # Emit only the smallest complete window per anchor to maximise
            # start-time spread; the deduper preserves a wide selection.
            break

    # Stable order before dedupe: score desc, then earlier start, then shorter.
    candidates.sort(
        key=lambda c: (-c["virality_score"], c["start"], c["end"] - c["start"])
    )
    return {"job_id": job_id, "model": MOCK_MODEL, "candidates": candidates}


# ── Sentence reconstruction + index-based boundary snapping ──────────────────
# The single highest-leverage fix (per research): instead of letting the LLM
# return raw float timestamps (which land mid-sentence / cut the question off
# from the answer), we reconstruct SENTENCES from the word-level transcript, feed
# the LLM an indexed sentence list, and have it return start/end SENTENCE INDICES.
# We then look up the real word-level start/end in code — boundaries fall on
# sentence edges by construction, and the LLM can't hallucinate a timestamp.

# A clip MUST NOT start on one of these — an orphan pronoun/conjunction/discourse
# marker whose referent lives in an earlier, un-included sentence ("So…", "And…",
# "But it…", "That's why…"). Nobody else does this; it's our differentiator.
_ORPHAN_START_WORDS = {
    "so", "and", "but", "because", "which", "also", "then", "plus", "anyway",
    "however", "therefore", "thus", "though", "although", "yet", "or", "nor",
    "it", "they", "he", "she", "this", "that", "those", "these", "them", "him",
    "her", "his", "their", "its", "theirs", "hers",
}


@dataclass
class _Sentence:
    """One reconstructed sentence with exact word-level timing."""

    idx: int
    text: str
    start: float
    end: float


def _reconstruct_sentences(transcript: dict[str, Any]) -> list["_Sentence"]:
    """Rebuild sentences from the word-level transcript with exact timing.

    Walks every word in order, accumulating into a sentence until a terminal
    punctuation (``.?!``) closes it (or a long pause / the segment ends). Each
    sentence's start = its first word's start, end = its last word's end — so any
    boundary we pick from these is guaranteed to land on a real sentence edge.
    Falls back to segment-level when words are absent.
    """
    sentences: list[_Sentence] = []
    buf: list[str] = []
    s_start: Optional[float] = None
    last_end = 0.0

    def flush() -> None:
        nonlocal buf, s_start
        if buf and s_start is not None:
            text = " ".join(buf).strip()
            if text:
                sentences.append(_Sentence(len(sentences), text, s_start, last_end))
        buf = []
        s_start = None

    segments = transcript.get("segments", [])
    for seg in segments:
        words = seg.get("words") or []
        if not words:
            # No word timing: close any open sentence, then treat the whole
            # segment as one sentence so order/timing stay consistent.
            flush()
            txt = str(seg.get("text", "")).strip()
            if txt:
                sentences.append(
                    _Sentence(len(sentences), txt,
                              float(seg["start"]), float(seg["end"]))
                )
            continue
        for w in words:
            tok = str(w.get("word", "")).strip()
            if not tok:
                continue
            try:
                w_start, w_end = float(w["start"]), float(w["end"])
            except (KeyError, TypeError, ValueError):
                continue
            # A >0.8s gap between words ends a sentence (natural pause). We do NOT
            # flush at segment boundaries — WhisperX segments often split a single
            # spoken sentence, so flushing there would cut a sentence in half. A
            # sentence ends only on terminal punctuation or a real pause.
            if buf and s_start is not None and (w_start - last_end) > 0.8:
                flush()
            if s_start is None:
                s_start = w_start
            buf.append(tok)
            last_end = w_end
            if tok[-1] in ".?!":
                flush()
    flush()  # close any sentence still open at the end of the transcript
    return sentences


def _starts_on_orphan(text: str) -> bool:
    """True if the sentence opens on an orphan pronoun/conjunction (no referent)."""
    first = text.strip().split()
    if not first:
        return False
    w = first[0].lower().strip(",.;:—-\"'")
    return w in _ORPHAN_START_WORDS


def _repair_start_idx(sentences: list["_Sentence"], start_idx: int, end_idx: int) -> int:
    """Walk a clip's start back off an orphan-pronoun sentence to a clean one.

    If the chosen start sentence opens on "So/And/It/That…", step the start
    BACKWARD to the nearest preceding sentence that introduces its own subject,
    so the clip doesn't begin mid-reference. Won't cross more than 2 sentences
    back (keeps length sane); returns the original index if no clean start found.
    """
    if not (0 <= start_idx <= end_idx < len(sentences)):
        return start_idx
    i = start_idx
    for _ in range(3):  # check start + up to 2 sentences back
        if not _starts_on_orphan(sentences[i].text):
            return i  # found a clean subject start
        if i == 0:
            break
        i -= 1
    # No clean start within reach → keep the LLM's original choice rather than
    # returning a still-orphan earlier index (which would also lengthen the clip).
    return start_idx


def _indices_to_clip(
    sentences: list["_Sentence"], start_idx: int, end_idx: int,
) -> Optional[tuple[float, float, str]]:
    """Resolve a sentence index range to (start_sec, end_sec, joined_text).

    Clamps indices, repairs an orphan-pronoun start, and returns real word-level
    times. ``None`` when the range is invalid.
    """
    n = len(sentences)
    if n == 0:
        return None
    # LLM JSON may hand back "5", 5.0, "5.0", or null — coerce defensively so a
    # stray type never crashes the whole scoring run; un-coercible → drop.
    try:
        start_idx = int(float(start_idx))
        end_idx = int(float(end_idx))
    except (TypeError, ValueError):
        return None
    start_idx = max(0, min(n - 1, start_idx))
    end_idx = max(0, min(n - 1, end_idx))
    if end_idx < start_idx:
        start_idx, end_idx = end_idx, start_idx
    start_idx = _repair_start_idx(sentences, start_idx, end_idx)
    text = " ".join(s.text for s in sentences[start_idx:end_idx + 1]).strip()
    return sentences[start_idx].start, sentences[end_idx].end, text


def _build_sentence_prompt(
    transcript: dict[str, Any], sentences: list["_Sentence"],
) -> str:
    """Indexed sentence list for the LLM (returns indices, not timestamps)."""
    lines = [
        f"[{s.idx}] ({s.start:.1f}-{s.end:.1f}s) {s.text}"
        for s in sentences
    ]
    return (
        f"Video duration: {transcript.get('duration')}s. "
        f"Language: {transcript.get('language')}.\n\n"
        "Sentences (index, time, text):\n" + "\n".join(lines) + "\n\n"
        "Select self-contained short-clip moments. For EACH clip return "
        '{"start_idx": <int>, "end_idx": <int>, "hook_line", "hook_title", '
        '"payoff_line", "hook_type", "virality_score", "reason", '
        '"suggested_title", "hashtags", "description"}. '
        "start_idx/end_idx MUST be indices from the list above (do NOT invent "
        "timestamps). The clip [start_idx..end_idx] must contain a complete "
        "hook->build->PAYOFF arc that makes sense with no prior context; if it "
        "opens with a question it MUST include the answer; never start on a bare "
        'pronoun or conjunction ("So/And/But/It/That"). Aim for 15-60s '
        "(roughly 3-15 sentences). Return JSON {\"candidates\": [...]}."
    )


# ── Shared prompt + length-bound helpers (OpenAI + Gemini) ───────────────────

def _load_rubric() -> str:
    """Read the virality rubric used as the scoring system instruction."""
    settings = get_settings()
    return (settings.repo_root / "pipeline" / "prompts" / "virality_rubric.txt").read_text(
        encoding="utf-8"
    )


def _build_transcript_prompt(transcript: dict[str, Any]) -> str:
    """Compact transcript view for the prompt (segments with timing + speaker)."""
    seg_lines = [
        f"[{s['start']:.2f}-{s['end']:.2f}] {s['speaker']}: {s['text']}"
        for s in transcript.get("segments", [])
    ]
    return (
        f"Video duration: {transcript.get('duration')}s. "
        f"Language: {transcript.get('language')}.\n\nTranscript:\n"
        + "\n".join(seg_lines)
    )


def _enforce_length_bounds(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop candidates whose duration falls outside the rubric's 20-90s window."""
    return [
        c for c in candidates
        if MIN_CLIP_SEC <= (float(c["end"]) - float(c["start"])) <= MAX_CLIP_SEC
    ]


def _resolve_index_candidates(
    candidates: list[dict[str, Any]], sentences: list["_Sentence"],
) -> list[dict[str, Any]]:
    """Turn LLM start_idx/end_idx candidates into real start/end-second clips.

    For each candidate carrying ``start_idx``/``end_idx``, look up the real
    word-level times (snapping to sentence edges + repairing orphan-pronoun
    starts via :func:`_indices_to_clip`). Candidates that already carry
    start/end (e.g. a model that ignored the index instruction) are passed
    through. Invalid/empty ranges are dropped.
    """
    out: list[dict[str, Any]] = []
    for c in candidates:
        if "start_idx" in c or "end_idx" in c:
            # Treat a present-but-null key as missing so one index can backfill
            # the other (e.g. {"start_idx": null, "end_idx": 8}).
            si = c.get("start_idx")
            ei = c.get("end_idx")
            if si is None:
                si = ei
            if ei is None:
                ei = si
            resolved = _indices_to_clip(sentences, si, ei)
            if resolved is None:
                continue
            start, end, text = resolved
            c["start"], c["end"] = round(start, 2), round(end, 2)
            # Backfill hook/payoff from the real clip text when the model left
            # them blank, so the completeness check sees the true boundaries.
            if not str(c.get("hook_line", "")).strip():
                c["hook_line"] = _first_sentence(text)
            if not str(c.get("payoff_line", "")).strip():
                c["payoff_line"] = _last_sentence(text)
            c.pop("start_idx", None)
            c.pop("end_idx", None)
            out.append(c)
        elif "start" in c and "end" in c:
            out.append(c)
    return out


# ── Real GPT-4o-mini scorer ──────────────────────────────────────────────────

def _score_real(job_id: str, transcript: dict[str, Any]) -> dict[str, Any]:
    """Score with GPT-4o-mini in JSON mode against the rubric file."""
    from openai import OpenAI  # lazy import; never needed in MOCK_MODE

    settings = get_settings()
    rubric = _load_rubric()
    sentences = _reconstruct_sentences(transcript)
    user_payload = (
        _build_sentence_prompt(transcript, sentences) if sentences
        else _build_transcript_prompt(transcript)
    )

    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.scoring_model,
        response_format={"type": "json_object"},
        temperature=0.4,
        messages=[
            {"role": "system", "content": rubric},
            {"role": "user", "content": user_payload},
        ],
    )
    parsed = json.loads(resp.choices[0].message.content or "{}")
    candidates = parsed.get("candidates", [])

    if sentences:
        candidates = _resolve_index_candidates(candidates, sentences)
    # Enforce length bounds defensively (the model is told but we double-check).
    candidates = _enforce_length_bounds(candidates)
    return {"job_id": job_id, "model": settings.scoring_model, "candidates": candidates}


# ── Real Gemini scorer (free tier) ───────────────────────────────────────────

def _score_gemini(job_id: str, transcript: dict[str, Any]) -> dict[str, Any]:
    """Score with Google Gemini in JSON mode against the rubric file.

    Uses the new google-genai SDK. Builds the SAME prompt as ``_score_real``
    (rubric as the system instruction + the compact transcript), asks for a JSON
    response, parses it, and returns the same {job_id, model, candidates} shape.
    """
    import time

    from google import genai  # lazy import; never needed in MOCK_MODE

    settings = get_settings()
    rubric = _load_rubric()
    # Index-based selection: feed an indexed SENTENCE list and get back sentence
    # indices we resolve to exact times (no mid-sentence cuts, no hallucinated
    # timestamps). Fall back to the old segment prompt only if reconstruction
    # yields nothing (e.g. a wordless transcript).
    sentences = _reconstruct_sentences(transcript)
    user_payload = (
        _build_sentence_prompt(transcript, sentences) if sentences
        else _build_transcript_prompt(transcript)
    )
    client = genai.Client(api_key=settings.gemini_api_key)

    config = {
        "system_instruction": rubric,
        "response_mime_type": "application/json",
        "temperature": 0.4,
    }

    # The free tier returns transient 503 UNAVAILABLE ("high demand") and 429
    # spikes. Retry with backoff, and fall back to lighter models that share a
    # different capacity pool. The configured model is tried first.
    fallback_models = [
        settings.gemini_model,
        "gemini-2.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash",
    ]
    # De-dupe while preserving order.
    models: list[str] = list(dict.fromkeys(fallback_models))

    last_err: Exception | None = None
    used_model = settings.gemini_model
    resp = None
    for model in models:
        for attempt in range(3):
            try:
                resp = client.models.generate_content(
                    model=model, contents=user_payload, config=config
                )
                used_model = model
                break
            except Exception as e:  # noqa: BLE001 — inspect status to decide retry
                last_err = e
                msg = str(e)
                transient = any(s in msg for s in ("503", "UNAVAILABLE", "429", "overloaded"))
                if not transient:
                    raise
                time.sleep(2 * (attempt + 1))  # 2s, 4s, 6s
        if resp is not None:
            break
    if resp is None:
        raise RuntimeError(
            f"Gemini scoring failed after retries across {models}: {last_err}"
        )

    parsed = json.loads(resp.text or "{}")
    candidates = parsed.get("candidates", [])

    # Resolve sentence indices → real word-level times (sentence-aligned, orphan
    # starts repaired), then enforce length bounds defensively.
    if sentences:
        candidates = _resolve_index_candidates(candidates, sentences)
    candidates = _enforce_length_bounds(candidates)
    return {"job_id": job_id, "model": used_model, "candidates": candidates}


def _main() -> None:
    parser = argparse.ArgumentParser(description="FD clip scoring stage")
    parser.add_argument("--job-id", default="demo-job-0001")
    parser.add_argument("--top", type=int, default=None, help="Keep only top N clips")
    args = parser.parse_args()

    result = score_clips(args.job_id, top_n=args.top)
    print(f"Scored job {result['job_id']} with model={result['model']}")
    print(f"{len(result['candidates'])} candidate(s) (ranked):")
    for rank, c in enumerate(result["candidates"], 1):
        dur = c["end"] - c["start"]
        print(
            f"  #{rank} score={c['virality_score']:3d} "
            f"[{c['start']:6.2f}-{c['end']:6.2f}] ({dur:4.1f}s) {c['hook_line'][:55]}"
        )


if __name__ == "__main__":
    _main()
