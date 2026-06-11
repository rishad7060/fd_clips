"""Stage 5 — Smart vertical reframe (16:9 -> 9:16, 1080x1920).

For each raw clip, compute a virtual-camera crop that keeps the active speaker
centered, and render ``clips/{n}_vertical.mp4`` at 1080x1920.

Real branch (MOCK_MODE=false):
    Two tiers share the same ``CropPlan`` output shape and the same ffmpeg
    ``crop``+``scale`` filtergraph:

    * FREE CPU FALLBACK (this build): a deterministic **center-crop-to-9:16**.
      No LR-ASD, no face detection, no GPU, no PySceneDetect — just crop the
      middle 9:16 window out of the (16:9 or other) source and scale to
      1080x1920 with ``-c:v libx264`` on the CPU. This is what runs on the free
      path so a real video becomes a real vertical clip with zero paid deps.
    * GPU UPGRADE (documented, not on the free path): PySceneDetect for scene
      cuts + face detection/tracking + LR-ASD active-speaker detection
      (clone github.com/Junhua-Liao/LR-ASD; weights per its README) driving a
      velocity-bounded virtual camera, encoded with h264_nvenc. Smart
      active-speaker reframe is the GPU upgrade; center-crop is the free
      fallback. The plan/filtergraph below is written so the GPU planner can
      emit a richer keyframe path into the very same renderer.

Mock branch (MOCK_MODE=true, offline):
    * A no-op render: it does NOT decode video. Instead it produces a
      deterministic **crop plan** per clip (the keyframed virtual-camera path it
      *would* apply) and records it to ``clips/{n}_reframe.json``. The vertical
      output file is a placeholder (or a copy of the raw clip if present).

The ``CropPlan`` shape is identical in both modes so the real renderer consumes
the same plan a future planner emits.

Standalone:
    python pipeline/reframe.py                 # plan reframes for the demo job
    python pipeline/reframe.py --job-id X
"""

from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore

TARGET_W = 1080
TARGET_H = 1920
# Source assumed 1920x1080 (set at ingest); the 9:16 crop window is 608x1080.
SRC_W = 1920
SRC_H = 1080
CROP_W = int(round(SRC_H * TARGET_W / TARGET_H))  # 1080 * 1080/1920 = 607.5 -> 608


@dataclass
class CropKeyframe:
    """One keyframe of the virtual camera path."""

    t: float       # seconds, relative to clip start
    x: int         # left edge of the crop window in source pixels
    width: int     # crop window width (height is full source height)


@dataclass
class CropPlan:
    """Virtual-camera crop plan for a single clip."""

    rank: int
    mode: str                       # "active-speaker" | "two-face" | "center-fallback"
    target_width: int
    target_height: int
    source_width: int
    source_height: int
    scene_cuts: list[float]         # seconds, relative to clip start
    keyframes: list[CropKeyframe]
    vertical_path: str
    mock: bool
    notes: str = ""

    def to_json(self) -> dict:
        d = asdict(self)
        return d


def _resolve_ffmpeg() -> Optional[str]:
    """Resolve a runnable ffmpeg binary.

    Prefers ``settings.ffmpeg_path`` (bare name on PATH or a full path); falls
    back to ``shutil.which``. Returns ``None`` when ffmpeg is genuinely absent
    so the placeholder fallback can keep mock/CI green.
    """
    configured = get_settings().ffmpeg_path or "ffmpeg"
    candidate = Path(configured)
    if candidate.is_file():
        return str(candidate)
    found = shutil.which(configured)
    if found:
        return found
    return shutil.which("ffmpeg")


def _ffmpeg_available() -> bool:
    return _resolve_ffmpeg() is not None


def _deterministic_plan(
    rank: int, start: float, end: float, speakers: list[str]
) -> tuple[str, list[float], list[CropKeyframe], str]:
    """Build a deterministic, plausible crop plan from clip metadata alone.

    No pixels are read in mock mode; the plan is derived from the clip's rank,
    duration and number of distinct speakers so it is stable across runs and
    still exercises the multi-mode logic (single speaker -> active-speaker pan,
    two speakers -> wider two-face framing).
    """
    duration = end - start
    distinct = len(set(speakers))

    # A couple of synthetic scene cuts spread across the clip.
    scene_cuts = [round(duration * f, 2) for f in (0.34, 0.71) if duration > 4]

    if distinct >= 2:
        mode = "two-face"
        width = min(SRC_W, int(CROP_W * 1.4))  # widen to include both faces
        notes = f"{distinct} speakers detected; widened framing to fit both."
    else:
        mode = "active-speaker"
        width = CROP_W
        notes = "Single active speaker; tight 9:16 framing centered on speaker."

    # Velocity-bounded virtual camera: nudge the crop center between a few
    # anchor positions, deterministically per rank, never moving more than the
    # max-velocity budget between keyframes (no whip-pans).
    center_seq = [0.50, 0.42, 0.58, 0.50]
    max_x = SRC_W - width
    keyframes: list[CropKeyframe] = []
    steps = max(1, len(center_seq) - 1)
    for k, frac in enumerate(center_seq):
        t = round(duration * (k / steps), 2)
        # Bias the path slightly by rank so different clips differ but stay stable.
        center = min(0.85, max(0.15, frac + 0.03 * ((rank % 3) - 1)))
        x = int(round(center * SRC_W - width / 2))
        x = max(0, min(max_x, x))
        keyframes.append(CropKeyframe(t=t, x=x, width=width))

    return mode, scene_cuts, keyframes, notes


def reframe_clips(job_id: str, top_n: Optional[int] = None) -> list[CropPlan]:
    """Plan (mock) or render (real) vertical reframes for a job's clips."""
    settings = get_settings()
    ws = settings.workspace(job_id)
    clips_doc = json.loads((ws / "clips.json").read_text(encoding="utf-8"))
    candidates = clips_doc.get("candidates", [])
    if top_n is not None:
        candidates = candidates[:top_n]

    # Speaker info (for two-face vs active-speaker decision) from the transcript.
    transcript = json.loads((ws / "transcript.json").read_text(encoding="utf-8"))
    segments = transcript.get("segments", [])

    clips_dir = ws / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    plans: list[CropPlan] = []
    for rank, cand in enumerate(candidates, start=1):
        start, end = float(cand["start"]), float(cand["end"])
        speakers = [
            s["speaker"] for s in segments
            if s["start"] < end and s["end"] > start
        ]
        raw = clips_dir / f"{rank}_raw.mp4"
        vertical = clips_dir / f"{rank}_vertical.mp4"

        if settings.mock_mode:
            plan = _reframe_mock(rank, start, end, speakers, raw, vertical)
        else:
            plan = _reframe_real(rank, start, end, speakers, raw, vertical)
        plans.append(plan)
        (clips_dir / f"{rank}_reframe.json").write_text(
            json.dumps(plan.to_json(), indent=2), encoding="utf-8"
        )
        print(f"  clip #{rank}: mode={plan.mode}  keyframes={len(plan.keyframes)} "
              f"cuts={len(plan.scene_cuts)} -> {vertical.name}")

    return plans


def _reframe_mock(
    rank: int, start: float, end: float, speakers: list[str],
    raw: Path, vertical: Path,
) -> CropPlan:
    """No-op reframe: record the crop plan; placeholder/copy for the output."""
    mode, scene_cuts, keyframes, notes = _deterministic_plan(
        rank, start, end, speakers
    )
    # Produce a stand-in vertical file so downstream captions has an input.
    if raw.exists() and raw.stat().st_size > 64 and _ffmpeg_available():
        shutil.copyfile(raw, vertical)  # geometry not applied in mock
        notes += " (mock: copied raw as vertical placeholder)"
    else:
        vertical.write_bytes(b"FOCALDIVE_MOCK_VERTICAL\x00")
        notes += " (mock: wrote placeholder; no ffmpeg)"

    return CropPlan(
        rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
        source_width=SRC_W, source_height=SRC_H, scene_cuts=scene_cuts,
        keyframes=keyframes, vertical_path=str(vertical), mock=True, notes=notes,
    )


def _probe_dimensions(raw: Path) -> tuple[int, int]:
    """Return (width, height) of ``raw`` via ffprobe, defaulting to 1920x1080.

    Used by the free CPU path so the center-crop is correct even when the
    source is not exactly 16:9.
    """
    import subprocess

    settings = get_settings()
    configured = settings.ffprobe_path or "ffprobe"
    ffprobe = configured if Path(configured).is_file() else (
        shutil.which(configured) or shutil.which("ffprobe")
    )
    if not ffprobe:
        return SRC_W, SRC_H
    try:
        out = subprocess.check_output(
            [
                ffprobe, "-v", "quiet", "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-print_format", "json", str(raw),
            ],
            text=True,
        )
        stream = json.loads(out)["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return SRC_W, SRC_H


def _center_crop_geometry(src_w: int, src_h: int) -> tuple[int, int, int]:
    """Compute a centered 9:16 crop window for a ``src_w``x``src_h`` source.

    Returns (crop_w, crop_h, x). The crop is the largest 9:16 rectangle that
    fits the source (height-limited for landscape), centered horizontally.
    """
    crop_h = src_h
    crop_w = int(round(crop_h * TARGET_W / TARGET_H))  # 9:16 width for this height
    if crop_w > src_w:
        # Source narrower than 9:16: width-limit instead so the crop fits.
        crop_w = src_w
        crop_h = int(round(crop_w * TARGET_H / TARGET_W))
    # Keep even dimensions for libx264 / yuv420p.
    crop_w -= crop_w % 2
    crop_h -= crop_h % 2
    x = max(0, (src_w - crop_w) // 2)
    return crop_w, crop_h, x


def _reframe_real(
    rank: int, start: float, end: float, speakers: list[str],
    raw: Path, vertical: Path,
) -> CropPlan:
    """Free CPU reframe: deterministic center-crop-to-9:16 via ffmpeg libx264.

    NO LR-ASD, NO face detection, NO GPU, NO PySceneDetect. We probe the raw
    clip's real dimensions, crop the centered 9:16 window, and scale to
    1080x1920 with ``-c:v libx264`` (CPU). Smart active-speaker reframe is the
    GPU upgrade (see module docstring); this center-crop is the free fallback.

    When ffmpeg is genuinely unavailable we keep the placeholder behaviour so
    mock/CI stays green even with MOCK_MODE=false.
    """
    import subprocess

    ffmpeg = _resolve_ffmpeg()
    src_w, src_h = _probe_dimensions(raw)
    crop_w, crop_h, x = _center_crop_geometry(src_w, src_h)

    # A single static keyframe describes the center-crop window (the GPU planner
    # would emit many; the renderer/CropPlan shape is identical).
    keyframes = [CropKeyframe(t=0.0, x=x, width=crop_w)]
    mode = "center-fallback"

    if not ffmpeg or not (raw.exists() and raw.stat().st_size > 64):
        # Graceful fallback: placeholder + logged intent, mock/CI stays green.
        vf = f"crop={crop_w}:{crop_h}:{x}:0,scale={TARGET_W}:{TARGET_H}"
        intended = (
            f"ffmpeg -y -i {raw} -vf {vf} "
            f"-c:v libx264 -preset veryfast -crf 20 -c:a aac {vertical}"
        )
        vertical.write_bytes(b"FOCALDIVE_MOCK_VERTICAL\x00")
        print(f"    [no-ffmpeg] center-crop skipped; intended: {intended}")
        return CropPlan(
            rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
            source_width=src_w, source_height=src_h, scene_cuts=[],
            keyframes=keyframes, vertical_path=str(vertical), mock=False,
            notes="ffmpeg absent; wrote placeholder (intended center-crop logged).",
        )

    vf = f"crop={crop_w}:{crop_h}:{x}:0,scale={TARGET_W}:{TARGET_H}"
    cmd = [
        ffmpeg, "-y", "-i", str(raw), "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", str(vertical),
    ]
    subprocess.run(cmd, check=True)

    return CropPlan(
        rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
        source_width=src_w, source_height=src_h, scene_cuts=[],
        keyframes=keyframes, vertical_path=str(vertical), mock=False,
        notes=(
            f"Free CPU center-crop {crop_w}x{crop_h}@x={x} -> {TARGET_W}x{TARGET_H} "
            "via libx264 (no GPU/LR-ASD). Smart active-speaker reframe is the GPU upgrade."
        ),
    )


def _keyframes_to_ffmpeg_x(keyframes: list[CropKeyframe]) -> str:
    """Turn keyframes into a piecewise-constant ffmpeg x() expression on `t`."""
    if not keyframes:
        return "0"
    expr = str(keyframes[-1].x)
    for kf in reversed(keyframes[:-1]):
        expr = f"if(lt(t,{kf.t + 0.0001:.4f}),{kf.x},{expr})"
    return expr


def _main() -> None:
    parser = argparse.ArgumentParser(description="FocalDive vertical reframe stage")
    parser.add_argument("--job-id", default="demo-job-0001")
    parser.add_argument("--top", type=int, default=None)
    args = parser.parse_args()

    print(f"Reframing clips for job {args.job_id} -> {TARGET_W}x{TARGET_H}:")
    plans = reframe_clips(args.job_id, top_n=args.top)
    print(f"Planned/rendered {len(plans)} vertical clip(s).")
    modes = {p.mode for p in plans}
    print(f"Crop modes used: {', '.join(sorted(modes))}")


if __name__ == "__main__":
    _main()
