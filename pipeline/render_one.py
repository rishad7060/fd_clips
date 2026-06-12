"""Re-render a SINGLE clip with a new trim range and/or caption style.

Powers the editor's "Re-render clip" action (API ``POST /clips/render``). Given a
job, a clip rank, a new ``start``/``end`` and an optional caption style, it:

  1. updates that candidate's start/end in ``clips.json`` (so the gallery and
     downstream reflect the new trim),
  2. writes the chosen caption style to ``captions_style.json``,
  3. re-runs extract -> reframe -> captions for ONLY that one clip, overwriting
     ``clips/{rank}_raw|vertical|final.mp4`` + ``{rank}.ass`` + ``{rank}_thumb.jpg``.

It reuses the exact same stage functions as the full pipeline by temporarily
pointing them at a one-candidate view, so the output is identical to a fresh run.

Standalone:
    python pipeline/render_one.py --job-id X --rank 1 --start 12.0 --end 45.0
    python pipeline/render_one.py --job-id X --rank 2 --style-json '{"template":"hormozi","alignment":"bottom"}'
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
    from . import extract, reframe, captions
except ImportError:  # standalone
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore
    import extract, reframe, captions  # type: ignore

MIN_CLIP_SEC = 3.0
MAX_CLIP_SEC = 180.0


def render_one(
    job_id: str,
    rank: int,
    *,
    start: Optional[float] = None,
    end: Optional[float] = None,
    style: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Re-render clip ``rank`` for ``job_id``; return the updated candidate dict.

    ``start``/``end`` override the trim when provided (validated to a sane range).
    ``style`` (web shape) is persisted for the captions stage. Raises ValueError
    for a bad rank or an invalid range.
    """
    settings = get_settings()
    ws = settings.workspace(job_id)
    clips_path = ws / "clips.json"
    if not clips_path.exists():
        raise ValueError(f"clips.json not found for job {job_id}")

    doc = json.loads(clips_path.read_text(encoding="utf-8"))
    candidates = doc.get("candidates", [])
    if rank < 1 or rank > len(candidates):
        raise ValueError(f"rank {rank} out of range (1..{len(candidates)})")
    cand = candidates[rank - 1]

    # Apply the new trim if given, validating the range.
    if start is not None or end is not None:
        new_start = float(start if start is not None else cand["start"])
        new_end = float(end if end is not None else cand["end"])
        dur = new_end - new_start
        if new_start < 0 or dur < MIN_CLIP_SEC or dur > MAX_CLIP_SEC:
            raise ValueError(
                f"invalid trim: start={new_start}, end={new_end} "
                f"(duration must be {MIN_CLIP_SEC}-{MAX_CLIP_SEC}s)"
            )
        cand["start"], cand["end"] = round(new_start, 3), round(new_end, 3)
        clips_path.write_text(
            json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # Persist the caption style for the captions stage.
    if style:
        (ws / "captions_style.json").write_text(
            json.dumps(style, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    # Re-render ONLY this clip by running each stage against a one-candidate view.
    # The stage functions read clips.json and index by position, so we hand them a
    # temp clips.json containing just this candidate at index 0, then restore.
    _render_single_stage_passthrough(ws, clips_path, doc, rank, cand)

    return cand


def _render_single_stage_passthrough(
    ws: Path, clips_path: Path, full_doc: dict[str, Any],
    rank: int, cand: dict[str, Any],
) -> None:
    """Run extract/reframe/captions for one clip, writing rank-numbered outputs.

    The stages name outputs by 1-based position in the candidate list they see.
    To make them write ``{rank}_*`` we temporarily swap clips.json for a doc whose
    candidate list has this clip padded to position ``rank`` (earlier slots are
    placeholders the stages skip via top_n), then restore the real clips.json.
    """
    # Build a doc where candidates[0..rank-1] exist but only index rank-1 is ours;
    # simplest correct approach: a list of length `rank` where the last is `cand`
    # and the rest are copies of `cand` (they'd write {1..rank-1} but we only keep
    # rank by passing top_n=rank and then the stages overwrite 1..rank — so we
    # instead render exactly one by temporarily making a single-item list and
    # renaming outputs. Cleanest: single-item list + post-rename.
    clips_dir = ws / "clips"
    templates = ("{}_raw.mp4", "{}_vertical.mp4", "{}_final.mp4",
                 "{}.ass", "{}_thumb.jpg", "{}_reframe.json")

    # The stages always write position-1 outputs ({1}_*). When rank != 1 that
    # would clobber the real clip #1, so we stash clip #1's existing files first
    # and restore them after renaming our freshly-rendered output to {rank}_*.
    stash: dict[Path, bytes] = {}
    if rank != 1:
        for tmpl in templates:
            f = clips_dir / tmpl.format(1)
            if f.exists():
                stash[f] = f.read_bytes()

    single = {**full_doc, "candidates": [cand]}
    backup = clips_path.read_text(encoding="utf-8")
    clips_path.write_text(json.dumps(single, ensure_ascii=False), encoding="utf-8")
    try:
        extract.extract_clips(ws.name, top_n=1)
        reframe.reframe_clips(ws.name, top_n=1)
        captions.caption_clips(ws.name, top_n=1)
    finally:
        clips_path.write_text(backup, encoding="utf-8")

    if rank != 1:
        # Move freshly-rendered {1}_* -> {rank}_*, then restore stashed clip #1.
        for tmpl in templates:
            src = clips_dir / tmpl.format(1)
            dst = clips_dir / tmpl.format(rank)
            if src.exists():
                dst.unlink(missing_ok=True)
                src.replace(dst)
        for path, data in stash.items():
            path.write_bytes(data)


def _main() -> None:
    p = argparse.ArgumentParser(description="Re-render a single clip")
    p.add_argument("--job-id", required=True)
    p.add_argument("--rank", type=int, required=True)
    p.add_argument("--start", type=float, default=None)
    p.add_argument("--end", type=float, default=None)
    p.add_argument("--style-json", default=None)
    args = p.parse_args()

    style = json.loads(args.style_json) if args.style_json else None
    cand = render_one(
        args.job_id, args.rank, start=args.start, end=args.end, style=style
    )
    print("@@RENDERED@@ " + json.dumps(cand))
    print(f"Re-rendered clip #{args.rank} of job {args.job_id}: "
          f"[{cand['start']:.2f}-{cand['end']:.2f}]")


if __name__ == "__main__":
    _main()
