"""Stage 3 — Clip scoring (the core IP).

Reads ``workspace/{job_id}/transcript.json`` and produces
``workspace/{job_id}/clips.json`` conforming to CONTRACTS.md §3:
{job_id, model, candidates[]} where each candidate is
{start, end, hook_line, virality_score, reason, suggested_title}, sorted by
virality_score desc and deduped (overlap > 50% drops the lower score).

Real branch (MOCK_MODE=false):
    * Send the transcript + prompts/virality_rubric.txt to GPT-4o-mini in JSON
      mode (response_format={"type": "json_object"}) so parsing never fails.

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

    if settings.mock_mode:
        result = _score_mock(job_id, transcript)
    else:
        result = _score_real(job_id, transcript)

    # Dedupe overlapping candidates, then optionally trim to top_n.
    result["candidates"] = _dedupe_overlaps(result["candidates"])
    result["candidates"].sort(key=lambda c: c["virality_score"], reverse=True)
    if top_n is not None:
        result["candidates"] = result["candidates"][:top_n]

    (ws / "clips.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return result


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


# ── Real GPT-4o-mini scorer ──────────────────────────────────────────────────

def _score_real(job_id: str, transcript: dict[str, Any]) -> dict[str, Any]:
    """Score with GPT-4o-mini in JSON mode against the rubric file."""
    from openai import OpenAI  # lazy import; never needed in MOCK_MODE

    settings = get_settings()
    rubric = (settings.repo_root / "pipeline" / "prompts" / "virality_rubric.txt").read_text(
        encoding="utf-8"
    )

    # Compact transcript view for the prompt (segments with timing + speaker).
    seg_lines = [
        f"[{s['start']:.2f}-{s['end']:.2f}] {s['speaker']}: {s['text']}"
        for s in transcript.get("segments", [])
    ]
    user_payload = (
        f"Video duration: {transcript.get('duration')}s. "
        f"Language: {transcript.get('language')}.\n\nTranscript:\n"
        + "\n".join(seg_lines)
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

    # Enforce length bounds defensively (the model is told but we double-check).
    candidates = [
        c for c in candidates
        if MIN_CLIP_SEC <= (float(c["end"]) - float(c["start"])) <= MAX_CLIP_SEC
    ]
    return {"job_id": job_id, "model": settings.scoring_model, "candidates": candidates}


def _main() -> None:
    parser = argparse.ArgumentParser(description="FocalDive clip scoring stage")
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
