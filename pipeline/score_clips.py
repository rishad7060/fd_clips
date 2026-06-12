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
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore

MIN_CLIP_SEC = 20.0
MAX_CLIP_SEC = 90.0
MOCK_MODEL = "mock-heuristic-v1"

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


# ── Dedup / overlap helpers (shared by mock + real) ─────────────────────────

def _overlap_fraction(a: dict, b: dict) -> float:
    """Overlap as a fraction of the SHORTER clip's duration (0..1)."""
    inter = max(0.0, min(a["end"], b["end"]) - max(a["start"], b["start"]))
    shorter = min(a["end"] - a["start"], b["end"] - b["start"])
    return inter / shorter if shorter > 0 else 0.0


def _dedupe_overlaps(candidates: list[dict], threshold: float = 0.5) -> list[dict]:
    """Dedupe candidates that overlap by more than ``threshold`` of the shorter
    clip, keeping the higher-scored clip of each conflicting pair (CONTRACTS §3).

    Implemented as a left-to-right sweep over start time so that a chain of
    pairwise overlaps resolves to a well-spaced set rather than collapsing to a
    single global maximum: when a new candidate conflicts (> threshold) with the
    last kept clip, we keep whichever of the two scores higher and drop the other.
    Non-conflicting candidates are always kept.
    """
    if not candidates:
        return []
    ordered = sorted(
        candidates, key=lambda c: (c["start"], c["end"] - c["start"])
    )
    kept: list[dict] = [ordered[0]]
    for cand in ordered[1:]:
        prev = kept[-1]
        if _overlap_fraction(cand, prev) > threshold:
            # Conflict with the most recent kept clip: keep the higher score.
            if cand["virality_score"] > prev["virality_score"]:
                kept[-1] = cand
            # else drop cand
        else:
            kept.append(cand)
    return kept


# ── Mock heuristic scorer ────────────────────────────────────────────────────

def _first_sentence(text: str) -> str:
    """Return the first sentence of a block of text (the hook line)."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return parts[0].strip() if parts else text.strip()


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
            candidates.append(
                {
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "hook_line": hook,
                    "virality_score": score,
                    "reason": reason,
                    "suggested_title": _title_from(seg_i["text"]),
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


# ── Real GPT-4o-mini scorer ──────────────────────────────────────────────────

def _score_real(job_id: str, transcript: dict[str, Any]) -> dict[str, Any]:
    """Score with GPT-4o-mini in JSON mode against the rubric file."""
    from openai import OpenAI  # lazy import; never needed in MOCK_MODE

    settings = get_settings()
    rubric = _load_rubric()
    user_payload = _build_transcript_prompt(transcript)

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
    user_payload = _build_transcript_prompt(transcript)
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

    # Enforce length bounds defensively (same 20-90s window as the OpenAI path).
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
