"""Pipeline orchestrator — ingest -> transcribe -> score -> extract -> reframe -> captions.

Runs the full YT Shorts Clips pipeline for one source (URL or local file) and a
requested clip count. Features:

* Resumable: each stage writes a marker; completed stages are skipped on re-run
  unless ``--force`` is given.
* Per-stage timing, captured in ``workspace/{job_id}/run_state.json``.
* A rich summary table (clip rank, score, hook, duration, final path).

Everything runs offline in MOCK_MODE (the default when no OpenAI key is set).

Usage:
    python pipeline/run.py --clips 5 --mock
    python pipeline/run.py --source https://youtu.be/XXXX --clips 8 --job-id job1
    python pipeline/run.py --clips 5 --mock --force        # ignore resume markers
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any, Callable, Optional

try:
    from . import ingest, transcribe, score_clips, extract, reframe, captions
    from .config import get_settings
except ImportError:  # script invocation: python pipeline/run.py
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import ingest, transcribe, score_clips, extract, reframe, captions  # type: ignore
    from config import get_settings  # type: ignore

# Ordered stages (matches CONTRACTS.md JobStage, minus terminal "done").
STAGES = ["ingest", "transcribe", "score", "extract", "reframe", "captions"]

# Cumulative progress (0-100) reached at the END of each stage. Matches
# CONTRACTS.md §4 weights so the API/worker and the web progress ring agree.
STAGE_PROGRESS = {
    "ingest": 10,
    "transcribe": 35,
    "score": 45,
    "extract": 55,
    "reframe": 80,
    "captions": 100,
}

# When --json-progress is set, run.py prints one JSON object per line to stdout
# so a parent process (the NestJS worker) can forward them as WebSocket events.
_JSON_PROGRESS = False


# Free-plan source-length cap. Groq's ~25MB upload at 64 kbps mono mp3 is ~52
# min of audio; we cap a little under that so the gate fires BEFORE the upload
# fails, and present it as a plan limit (longer videos = paid, like Opus/Vizard).
FREE_MAX_SOURCE_SEC = 45 * 60  # 45 minutes


class PipelineUserError(Exception):
    """An error meant to be shown to the END USER (not a stack trace).

    ``code`` is a stable machine string the UI can switch on (e.g. to show an
    'Upgrade' button); ``message`` is the human-friendly text.
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.user_message = message


def _emit_error(code: str, message: str) -> None:
    """Emit one machine-readable error line (only in --json-progress mode)."""
    if not _JSON_PROGRESS:
        return
    print("@@ERROR@@ " + json.dumps({"type": "error", "code": code,
                                     "message": message}), flush=True)


def _emit_progress(stage: str, status: str, message: str) -> None:
    """Emit one machine-readable progress line (only in --json-progress mode)."""
    if not _JSON_PROGRESS:
        return
    event = {
        "type": "progress",
        "stage": stage,
        "status": status,
        "progress": STAGE_PROGRESS.get(stage, 0),
        "message": message,
    }
    print("@@PROGRESS@@ " + json.dumps(event), flush=True)


def _load_state(ws: Path) -> dict[str, Any]:
    f = ws / "run_state.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    return {"completed": {}, "timings": {}}


def _save_state(ws: Path, state: dict[str, Any]) -> None:
    (ws / "run_state.json").write_text(json.dumps(state, indent=2), encoding="utf-8")


def _enforce_length_limit(ws: Path) -> None:
    """Raise PipelineUserError('video_too_long') when the source is over the
    free-plan length cap. No-op in MOCK_MODE or when duration is unknown."""
    settings = get_settings()
    if settings.mock_mode:
        return
    meta_file = ws / "source.meta.json"
    if not meta_file.exists():
        return
    try:
        duration = float(json.loads(meta_file.read_text(encoding="utf-8")).get("duration", 0.0))
    except (json.JSONDecodeError, OSError, ValueError, TypeError):
        return
    if duration > FREE_MAX_SOURCE_SEC:
        mins = int(duration // 60)
        cap_mins = FREE_MAX_SOURCE_SEC // 60
        raise PipelineUserError(
            "video_too_long",
            f"This video is {mins} min long. The Free plan handles videos up to "
            f"{cap_mins} min. Upgrade your plan to process longer videos.",
        )


def _run_stage(
    name: str, fn: Callable[[], Any], ws: Path, state: dict[str, Any], force: bool
) -> Any:
    """Run one stage with resume + timing. Returns the stage's result (or None
    when skipped)."""
    if not force and state["completed"].get(name):
        elapsed = state["timings"].get(name, 0.0)
        print(f"[skip ] {name:<10} (already completed, {elapsed:.2f}s previously)")
        _emit_progress(name, "running", f"{name} (cached)")
        return None

    print(f"[run  ] {name} ...")
    _emit_progress(name, "running", f"Running {name}")
    t0 = time.perf_counter()
    result = fn()
    elapsed = time.perf_counter() - t0
    state["completed"][name] = True
    state["timings"][name] = round(elapsed, 3)
    _save_state(ws, state)
    print(f"[done ] {name:<10} {elapsed:.2f}s")
    _emit_progress(name, "running", f"{name} done")
    return result


def run_pipeline(
    source: str,
    job_id: str,
    clip_count: int,
    *,
    force: bool = False,
) -> dict[str, Any]:
    """Execute all stages and return a summary dict."""
    settings = get_settings()
    ws = settings.workspace(job_id)
    state = _load_state(ws)
    if force:
        state = {"completed": {}, "timings": {}}
        _save_state(ws, state)

    print("=" * 70)
    print(f"YT Shorts Clips pipeline  job={job_id}  clips={clip_count}  "
          f"mock={settings.mock_mode}")
    print(f"source: {source}")
    print(f"workspace: {ws}")
    print("=" * 70)

    _run_stage("ingest", lambda: ingest.ingest(source, job_id), ws, state, force)

    # Free-plan length gate: long videos exceed the free transcription upload
    # limit. Fail early (right after ingest, before the slow audio extract +
    # upload) with a clear UPGRADE message instead of a raw 25MB error deep in
    # transcribe. MOCK_MODE skips the gate (fixtures are short).
    _enforce_length_limit(ws)

    _run_stage("transcribe", lambda: transcribe.transcribe(job_id), ws, state, force)
    _run_stage(
        "score", lambda: score_clips.score_clips(job_id, top_n=clip_count),
        ws, state, force,
    )
    _run_stage(
        "extract", lambda: extract.extract_clips(job_id, top_n=clip_count),
        ws, state, force,
    )
    _run_stage(
        "reframe", lambda: reframe.reframe_clips(job_id, top_n=clip_count),
        ws, state, force,
    )
    _run_stage(
        "captions", lambda: captions.caption_clips(job_id, top_n=clip_count),
        ws, state, force,
    )

    state["completed"]["done"] = True
    _save_state(ws, state)

    summary = _build_summary(job_id, ws, clip_count, state)
    _print_summary(summary, state)
    if _JSON_PROGRESS:
        # Final machine-readable result line: the full summary for the parent.
        print("@@RESULT@@ " + json.dumps(summary), flush=True)
    return summary


def _build_summary(
    job_id: str, ws: Path, clip_count: int, state: dict[str, Any]
) -> dict[str, Any]:
    clips_doc = json.loads((ws / "clips.json").read_text(encoding="utf-8"))
    candidates = clips_doc.get("candidates", [])[:clip_count]
    rows = []
    for rank, c in enumerate(candidates, start=1):
        final = ws / "clips" / f"{rank}_final.mp4"
        rows.append(
            {
                "rank": rank,
                "score": c["virality_score"],
                "hook": c["hook_line"],
                "title": c.get("suggested_title", ""),
                "start": c["start"],
                "end": c["end"],
                "duration": round(c["end"] - c["start"], 2),
                "final_path": str(final),
                "final_exists": final.exists(),
            }
        )
    return {
        "job_id": job_id,
        "model": clips_doc.get("model"),
        "clip_count": len(rows),
        "rows": rows,
        "total_seconds": round(sum(state.get("timings", {}).values()), 3),
    }


def _print_summary(summary: dict[str, Any], state: dict[str, Any]) -> None:
    rows = summary["rows"]
    print()
    try:
        import sys

        from rich.console import Console
        from rich.table import Table

        # Reconfigure the existing stdout to UTF-8 (Python 3.7+) so the box-
        # drawing glyphs render on a Windows console whose code page is cp1252,
        # without creating a second, separately-buffered stream (which would
        # reorder output).
        try:
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass
        console = Console()
        table = Table(
            title=f"YT Shorts Clips - {summary['job_id']} "
                  f"({summary['clip_count']} clips, model={summary['model']})"
        )
        table.add_column("#", justify="right", style="bold")
        table.add_column("Score", justify="right")
        table.add_column("Dur", justify="right")
        table.add_column("Hook", overflow="fold", max_width=42)
        table.add_column("Final clip")
        table.add_column("OK", justify="center")
        for r in rows:
            table.add_row(
                str(r["rank"]), str(r["score"]), f"{r['duration']:.1f}s",
                r["hook"], Path(r["final_path"]).name,
                "ok" if r["final_exists"] else "--",
            )
        console.print(table)

        timing = Table(title="Per-stage timing")
        timing.add_column("Stage")
        timing.add_column("Seconds", justify="right")
        for st in STAGES:
            timing.add_row(st, f"{state['timings'].get(st, 0.0):.3f}")
        timing.add_row("[bold]total[/bold]", f"[bold]{summary['total_seconds']:.3f}[/bold]")
        console.print(timing)
    except Exception:  # rich missing or non-UTF console: plain fallback
        print(f"Summary - {summary['job_id']} ({summary['clip_count']} clips, "
              f"model={summary['model']})")
        print(f"{'#':>2} {'Score':>5} {'Dur':>6}  Hook")
        for r in rows:
            print(f"{r['rank']:>2} {r['score']:>5} {r['duration']:>5.1f}s  "
                  f"{r['hook'][:50]}")
        print("Per-stage timing:")
        for st in STAGES:
            print(f"  {st:<10} {state['timings'].get(st, 0.0):.3f}s")
        print(f"  {'total':<10} {summary['total_seconds']:.3f}s")


def _main() -> None:
    parser = argparse.ArgumentParser(description="YT Shorts Clips full pipeline")
    parser.add_argument("source", nargs="?", default="mock://fixture-podcast",
                        help="YouTube/remote URL or local file path")
    parser.add_argument("--source", dest="source_opt", default=None,
                        help="Alternative to the positional source argument")
    parser.add_argument("--clips", type=int, default=5, help="Number of clips (1-10)")
    parser.add_argument("--job-id", default="demo-job-0001")
    parser.add_argument("--mock", action="store_true",
                        help="Force MOCK_MODE for this run (no GPU/APIs)")
    parser.add_argument("--force", action="store_true",
                        help="Ignore resume markers and re-run every stage")
    parser.add_argument("--json-progress", action="store_true",
                        help="Emit machine-readable @@PROGRESS@@/@@RESULT@@ lines for a parent process")
    parser.add_argument("--style-json", default=None,
                        help="Caption style as a JSON string (web shape "
                             "{template,font,highlight_color,alignment}); written "
                             "to workspace/{job_id}/captions_style.json for the "
                             "captions stage.")
    args = parser.parse_args()

    global _JSON_PROGRESS
    _JSON_PROGRESS = args.json_progress

    if args.mock:
        os.environ["MOCK_MODE"] = "true"
        get_settings.cache_clear()  # rebuild Settings with the forced flag

    source = args.source_opt or args.source
    clip_count = max(1, min(10, args.clips))

    # Persist the app-chosen caption style so the captions stage picks it up.
    if args.style_json:
        try:
            style = json.loads(args.style_json)
            ws = get_settings().workspace(args.job_id)
            ws.mkdir(parents=True, exist_ok=True)
            (ws / "captions_style.json").write_text(
                json.dumps(style, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except (json.JSONDecodeError, OSError) as exc:
            print(f"[run] ignoring --style-json ({exc})")

    try:
        run_pipeline(source, args.job_id, clip_count, force=args.force)
    except PipelineUserError as exc:
        # A clean, user-facing failure (e.g. video too long). Emit a structured
        # @@ERROR@@ line the worker forwards to the UI, then exit non-zero.
        _emit_error(exc.code, exc.user_message)
        print(f"[error] {exc.code}: {exc.user_message}")
        raise SystemExit(2)


if __name__ == "__main__":
    _main()
