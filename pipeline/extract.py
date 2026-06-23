"""Stage 4 - Clip extraction.

For each scored candidate in ``workspace/{job_id}/clips.json`` cut the relevant
range out of ``source.mp4`` into ``workspace/{job_id}/clips/{n}_raw.mp4`` (n is
the 1-based rank, matching CONTRACTS.md §5).

Real branch (MOCK_MODE=false):
    * Stream-copy (``-c copy``) when the cut starts on (or near) a keyframe -
      fast and lossless.
    * Re-encode with ``-c:v libx264 -c:a aac`` (CPU, free, NO GPU/nvenc) when
      frame-accurate cuts are needed (start not on a keyframe).

Mock branch (MOCK_MODE=true, offline):
    * If ffmpeg is present, write a tiny real cut (so the file is a valid mp4).
    * If ffmpeg is absent, write a small placeholder file and LOG the exact
      ffmpeg command that would have run, so the intent is reviewable.

Standalone:
    python pipeline/extract.py                 # extract clips for the demo job
    python pipeline/extract.py --job-id X
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore


@dataclass
class ExtractedClip:
    """Result of extracting one clip."""

    rank: int
    start: float
    end: float
    duration: float
    raw_path: str
    mode: str          # "stream-copy" | "reencode" | "mock-placeholder" | "mock-ffmpeg"
    command: str       # the ffmpeg command (intended or executed)
    mock: bool

    def to_json(self) -> dict:
        return asdict(self)


def _resolve_ffmpeg() -> Optional[str]:
    """Resolve a runnable ffmpeg binary.

    Prefers ``settings.ffmpeg_path`` (which may be a bare name on PATH or a full
    path); falls back to ``shutil.which``. Returns the resolved path/name, or
    ``None`` when ffmpeg is genuinely absent (mock/CI fallback then kicks in).
    """
    configured = get_settings().ffmpeg_path or "ffmpeg"
    candidate = Path(configured)
    if candidate.is_file():
        return str(candidate)
    found = shutil.which(configured)
    if found:
        return found
    # Last resort: bare 'ffmpeg' on PATH.
    return shutil.which("ffmpeg")


def _resolve_ffprobe() -> Optional[str]:
    """Resolve a runnable ffprobe binary (see :func:`_resolve_ffmpeg`)."""
    configured = get_settings().ffprobe_path or "ffprobe"
    candidate = Path(configured)
    if candidate.is_file():
        return str(candidate)
    found = shutil.which(configured)
    if found:
        return found
    return shutil.which("ffprobe")


def _ffmpeg_available() -> bool:
    return _resolve_ffmpeg() is not None


def _cut_command(
    source: Path, start: float, duration: float, out: Path, *,
    stream_copy: bool, ffmpeg: str = "ffmpeg",
) -> list[str]:
    """Build the ffmpeg cut command for a clip (CPU/libx264, no nvenc)."""
    if stream_copy:
        # Fast seek before input + stream copy (keyframe-aligned).
        return [
            ffmpeg, "-y", "-ss", f"{start:.3f}", "-i", str(source),
            "-t", f"{duration:.3f}", "-c", "copy", "-avoid_negative_ts", "1",
            str(out),
        ]
    # Frame-accurate: decode + re-encode on CPU with libx264 (NO nvenc/GPU).
    return [
        ffmpeg, "-y", "-ss", f"{start:.3f}", "-i", str(source),
        "-t", f"{duration:.3f}", "-c:v", "libx264", "-preset", "ultrafast",
        "-crf", "20", "-c:a", "aac", "-pix_fmt", "yuv420p", str(out),
    ]


def extract_clips(
    job_id: str, top_n: Optional[int] = None
) -> list[ExtractedClip]:
    """Extract raw clips for a job and write ``clips/extract.json`` manifest."""
    settings = get_settings()
    ws = settings.workspace(job_id)
    clips_doc = json.loads((ws / "clips.json").read_text(encoding="utf-8"))
    candidates = clips_doc.get("candidates", [])
    if top_n is not None:
        candidates = candidates[:top_n]

    clips_dir = ws / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    source = ws / "source.mp4"

    results: list[ExtractedClip] = []
    for rank, cand in enumerate(candidates, start=1):
        start = float(cand["start"])
        end = float(cand["end"])
        duration = round(end - start, 3)
        out = clips_dir / f"{rank}_raw.mp4"

        if settings.mock_mode:
            result = _extract_mock(rank, source, start, duration, out)
        else:
            result = _extract_real(rank, source, start, duration, out)
        results.append(result)
        print(f"  clip #{rank}: {result.mode}  [{start:.2f}-{end:.2f}] -> {out.name}")

    (clips_dir / "extract.json").write_text(
        json.dumps([r.to_json() for r in results], indent=2), encoding="utf-8"
    )
    return results


def _extract_mock(
    rank: int, source: Path, start: float, duration: float, out: Path
) -> ExtractedClip:
    """Offline extract: real tiny cut if ffmpeg exists, else a logged placeholder."""
    # In mock mode we conservatively re-encode (frame-accurate) so the logged
    # command is the general case; stream-copy is a real-branch optimization.
    ffmpeg = _resolve_ffmpeg()
    # Always log a command that mentions ffmpeg (tests assert this); use the
    # resolved binary when present, else the bare name as the intended command.
    cmd = _cut_command(
        source, start, duration, out, stream_copy=False, ffmpeg=ffmpeg or "ffmpeg"
    )
    cmd_str = " ".join(cmd)

    if ffmpeg and source.exists() and source.stat().st_size > 64:
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return ExtractedClip(
                rank, start, start + duration, duration, str(out),
                "mock-ffmpeg", cmd_str, mock=True,
            )
        except subprocess.CalledProcessError:
            pass  # placeholder fallback below

    # No usable ffmpeg/source: write a placeholder and log intended command.
    out.write_bytes(b"FOCALDIVE_MOCK_CLIP\x00")
    print(f"    [mock] ffmpeg unavailable; intended: {cmd_str}")
    return ExtractedClip(
        rank, start, start + duration, duration, str(out),
        "mock-placeholder", cmd_str, mock=True,
    )


def _extract_real(
    rank: int, source: Path, start: float, duration: float, out: Path
) -> ExtractedClip:
    """Real extract: stream-copy when keyframe-aligned, else libx264 re-encode.

    When ffmpeg is genuinely absent we fall back to a placeholder + logged intent
    (same as the mock path) so a misconfigured non-mock run degrades gracefully
    instead of crashing the whole pipeline.
    """
    ffmpeg = _resolve_ffmpeg()
    if not ffmpeg:
        cmd = _cut_command(
            source, start, duration, out, stream_copy=False, ffmpeg="ffmpeg"
        )
        cmd_str = " ".join(cmd)
        out.write_bytes(b"FOCALDIVE_MOCK_CLIP\x00")
        print(f"    [no-ffmpeg] extract skipped; intended: {cmd_str}")
        return ExtractedClip(
            rank, start, start + duration, duration, str(out),
            "mock-placeholder", cmd_str, mock=False,
        )

    # Heuristic: probe the nearest preceding keyframe; if the cut start is within
    # ~0.05s of a keyframe, stream-copy is safe, otherwise re-encode for accuracy.
    stream_copy = _start_is_keyframe_aligned(source, start)
    cmd = _cut_command(
        source, start, duration, out, stream_copy=stream_copy, ffmpeg=ffmpeg
    )
    subprocess.run(cmd, check=True)
    return ExtractedClip(
        rank, start, start + duration, duration, str(out),
        "stream-copy" if stream_copy else "reencode", " ".join(cmd), mock=False,
    )


def _start_is_keyframe_aligned(source: Path, start: float, tol: float = 0.05) -> bool:
    """Return True if ``start`` is within ``tol`` of a keyframe (ffprobe)."""
    try:
        ffprobe = _resolve_ffprobe()
        if not ffprobe:
            return False
        cmd = [
            ffprobe, "-v", "quiet", "-select_streams", "v:0",
            "-show_frames", "-show_entries", "frame=pkt_pts_time,key_frame",
            "-read_intervals", f"{max(0.0, start - 2)}%{start + 2}",
            "-print_format", "json", str(source),
        ]
        data = json.loads(subprocess.check_output(cmd, text=True))
        for frame in data.get("frames", []):
            if frame.get("key_frame") == 1:
                kt = float(frame.get("pkt_pts_time", -999))
                if abs(kt - start) <= tol:
                    return True
    except Exception:
        return False
    return False


def _main() -> None:
    parser = argparse.ArgumentParser(description="FD clip extraction stage")
    parser.add_argument("--job-id", default="demo-job-0001")
    parser.add_argument("--top", type=int, default=None)
    args = parser.parse_args()

    print(f"Extracting clips for job {args.job_id}:")
    results = extract_clips(args.job_id, top_n=args.top)
    print(f"Extracted {len(results)} clip(s).")


if __name__ == "__main__":
    _main()
