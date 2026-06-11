"""Stage 5 — Smart vertical reframe (16:9 -> 9:16, 1080x1920).

For each raw clip, compute a virtual-camera crop that keeps the dominant
speaker centered, and render ``clips/{n}_vertical.mp4`` at 1080x1920.

Real branch (MOCK_MODE=false) — v2 MVP:
    **MediaPipe face-detect smart crop (CPU, free).** We open the raw clip with
    OpenCV, sample roughly every 5th frame, run MediaPipe face detection, pick
    the dominant (largest / most-confident) face each sample, and EMA-smooth its
    center across samples so the virtual camera doesn't jitter. That smoothed
    center is converted to a single static 9:16 crop window (clamped to frame
    bounds) and rendered with ``crop=w:h:x:y,scale=1080:1920`` on ``-c:v
    libx264`` (CPU, no nvenc). When no face is found in any sample we fall back
    to a centered 9:16 crop; good enough for single-speaker / talking-head
    content (the MVP scope — multi-speaker podcasts are cut, see fd_clips_v2.md
    Part 1).

    # PHASE 2 UPGRADES (documented, NOT on the free path — see fd_clips_v2.md
    # Part 5 "Users ask for podcasts/2-speakers"):
    #   * Swap the single largest-face heuristic for **LR-ASD active-speaker
    #     tracking** (clone github.com/Junhua-Liao/LR-ASD; weights per README) so
    #     the crop follows whoever is *talking* in a 2-person scene, not just the
    #     biggest face.
    #   * Emit a *per-frame / animated* crop window (a velocity-bounded virtual
    #     camera) instead of one static window per clip, fed to ffmpeg via a
    #     ``sendcmd`` script or a time-varying crop ``x=`` expression. The
    #     ``CropPlan`` keyframe list + ``_keyframes_to_ffmpeg_x`` helper below are
    #     already shaped to carry that richer path into the same renderer.
    #   * Add PySceneDetect scene cuts so the camera re-centers on hard cuts.
    #   * Encode with ``h264_nvenc`` on a GPU box for speed (CLAUDE.md GPU rule).
    # The static-window MediaPipe crop here is the $0 MVP; everything above turns
    # on only when paying customers demand it.

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

# ── MediaPipe smart-crop tuning (real branch only) ──────────────────────────
FRAME_SAMPLE_STRIDE = 5     # run face detection on every Nth decoded frame
EMA_ALPHA = 0.25            # crop-center smoothing weight (0.2-0.3 = calm camera)
FACE_MIN_CONFIDENCE = 0.5   # MediaPipe min detection confidence


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


# MediaPipe Face Detector (Tasks API) model — small (~224 KB), public, CPU-only.
# Cached under the repo so the one-time fetch happens once per machine. We only
# need it on the newer "Tasks-only" mediapipe builds that drop ``mp.solutions``.
_FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_detector/"
    "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
)


def _face_model_path() -> Optional[Path]:
    """Return a local path to the BlazeFace .tflite, downloading once if needed.

    Cached at ``<repo_root>/.cache/mediapipe/blaze_face_short_range.tflite``.
    Returns ``None`` if the model can't be obtained (offline) so the caller
    falls back to a centered crop.
    """
    import urllib.request

    cache_dir = get_settings().repo_root / ".cache" / "mediapipe"
    cache_dir.mkdir(parents=True, exist_ok=True)
    model = cache_dir / "blaze_face_short_range.tflite"
    if model.is_file() and model.stat().st_size > 1024:
        return model
    try:
        print(f"    [reframe] fetching MediaPipe face model -> {model}")
        urllib.request.urlretrieve(_FACE_MODEL_URL, str(model))
        return model if model.stat().st_size > 1024 else None
    except Exception as exc:  # pragma: no cover - network dependent
        print(f"    [reframe] face-model download failed ({exc}); center crop.")
        return None


def _make_face_detector(mp: Any) -> Optional[tuple[Any, Any]]:
    """Build a face detector across both MediaPipe API generations.

    Returns ``(detect_fn, closer)`` where ``detect_fn(rgb_ndarray) ->
    list[tuple[center_frac, area, score]]`` (one entry per detected face, all in
    0..1 fractions of frame size), and ``closer()`` releases any resources.
    Returns ``None`` when no usable detector can be constructed.

    Tier 1: the classic ``mp.solutions.face_detection`` API (no model file).
    Tier 2: the newer Tasks ``FaceDetector`` (needs a cached .tflite model).
    """
    # ── Tier 1: classic solutions API (preferred — no model download) ──
    solutions = getattr(mp, "solutions", None)
    if solutions is not None and hasattr(solutions, "face_detection"):
        det = solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=FACE_MIN_CONFIDENCE
        )

        def detect_classic(rgb: Any) -> list[tuple[float, float, float]]:
            res = det.process(rgb)
            out: list[tuple[float, float, float]] = []
            for d in res.detections or []:
                box = d.location_data.relative_bounding_box
                center = box.xmin + box.width / 2.0
                area = max(0.0, box.width) * max(0.0, box.height)
                score = d.score[0] if d.score else 0.0
                out.append((center, area, score))
            return out

        return detect_classic, det.close

    # ── Tier 2: Tasks FaceDetector (newer mediapipe; needs a model file) ──
    try:
        from mediapipe.tasks.python import vision
        from mediapipe.tasks.python.core.base_options import BaseOptions
    except Exception as exc:  # pragma: no cover
        print(f"    [reframe] no usable MediaPipe face API ({exc}); center crop.")
        return None

    model = _face_model_path()
    if model is None:
        return None

    options = vision.FaceDetectorOptions(
        base_options=BaseOptions(model_asset_path=str(model)),
        running_mode=vision.RunningMode.IMAGE,
        min_detection_confidence=FACE_MIN_CONFIDENCE,
    )
    det = vision.FaceDetector.create_from_options(options)

    def detect_tasks(rgb: Any) -> list[tuple[float, float, float]]:
        h, w = rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = det.detect(mp_image)
        out: list[tuple[float, float, float]] = []
        for d in res.detections or []:
            bb = d.bounding_box  # pixel coords
            center = (bb.origin_x + bb.width / 2.0) / max(1, w)
            area = (bb.width / max(1, w)) * (bb.height / max(1, h))
            score = d.categories[0].score if d.categories else 0.0
            out.append((center, area, score))
        return out

    return detect_tasks, det.close


def _smoothed_face_center_x(raw: Path, src_w: int, src_h: int) -> Optional[float]:
    """Sample the clip with MediaPipe and return an EMA-smoothed face center x.

    Opens ``raw`` with OpenCV, runs MediaPipe face detection on every
    ``FRAME_SAMPLE_STRIDE``-th frame, and on each sampled frame picks the
    *dominant* face (largest box area, breaking ties on detection score). The
    dominant face's horizontal center (as a fraction 0..1 of frame width) is
    fed through an exponential moving average (``EMA_ALPHA``) so the resulting
    virtual-camera center is stable rather than jittery.

    Returns the smoothed center as a pixel x-coordinate in source space, or
    ``None`` when OpenCV/MediaPipe can't open the clip or no face is detected in
    any sample (caller then falls back to a centered crop).

    Heavy/paid-ish deps (cv2, mediapipe) are imported lazily *inside* this
    real-branch helper so the mock path stays import-free.
    """
    # PHASE 2: replace the single-largest-face heuristic with LR-ASD
    # active-speaker tracking so the crop follows the talker, and emit a
    # time-varying center instead of one EMA value — see fd_clips_v2.md Part 5.
    try:
        import cv2  # lazy: real branch only
        import mediapipe as mp  # lazy: real branch only
    except Exception as exc:  # pragma: no cover - depends on host env
        print(f"    [reframe] MediaPipe/OpenCV unavailable ({exc}); center crop.")
        return None

    detector = _make_face_detector(mp)
    if detector is None:
        return None
    detect_fn, close_fn = detector

    cap = cv2.VideoCapture(str(raw))
    if not cap.isOpened():
        print("    [reframe] OpenCV could not open clip; center crop.")
        close_fn()
        return None

    ema_center: Optional[float] = None  # fraction 0..1 of frame width
    samples = 0
    try:
        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % FRAME_SAMPLE_STRIDE != 0:
                frame_idx += 1
                continue
            frame_idx += 1

            # MediaPipe expects contiguous RGB.
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = detect_fn(rgb)  # [(center_frac, area, score), ...]
            if not faces:
                continue

            # Dominant face = largest box area; tie-break on detection score.
            center_frac, _area, _score = max(faces, key=lambda f: (f[1], f[2]))
            center_frac = min(1.0, max(0.0, center_frac))

            if ema_center is None:
                ema_center = center_frac
            else:
                ema_center = (
                    EMA_ALPHA * center_frac + (1.0 - EMA_ALPHA) * ema_center
                )
            samples += 1
    finally:
        cap.release()
        try:
            close_fn()
        except Exception:
            pass

    if ema_center is None:
        print("    [reframe] no face detected in any sample; center crop.")
        return None

    print(f"    [reframe] face-tracked {samples} sample(s); "
          f"smoothed center={ema_center:.3f} of width.")
    return ema_center * src_w


def _crop_window_from_center(
    center_x: float, src_w: int, src_h: int
) -> tuple[int, int, int]:
    """Build a 9:16 crop window centered on ``center_x``, clamped to the frame.

    Returns (crop_w, crop_h, x). Width/height use the same largest-fitting 9:16
    rectangle as the center-crop fallback; only the horizontal offset changes to
    follow the (smoothed) face center.
    """
    crop_w, crop_h, _ = _center_crop_geometry(src_w, src_h)
    x = int(round(center_x - crop_w / 2.0))
    x = max(0, min(src_w - crop_w, x))  # clamp to frame bounds
    return crop_w, crop_h, x


def _reframe_real(
    rank: int, start: float, end: float, speakers: list[str],
    raw: Path, vertical: Path,
) -> CropPlan:
    """v2 MVP reframe: MediaPipe face-detect smart crop -> 9:16 via libx264.

    We sample the raw clip every ~5th frame with MediaPipe face detection,
    EMA-smooth the dominant face's center, and crop a static 9:16 window around
    it (clamped to the frame). When no face is found — or OpenCV/MediaPipe is
    unavailable — we fall back to a centered 9:16 crop. The window is then scaled
    to 1080x1920 and encoded with ``-c:v libx264`` (CPU, no nvenc).

    When ffmpeg is genuinely unavailable we keep the placeholder behaviour so
    mock/CI stays green even with MOCK_MODE=false.

    # PHASE 2: animated per-frame crop (sendcmd) + LR-ASD active-speaker
    # tracking + h264_nvenc — see module docstring and fd_clips_v2.md Part 5.
    """
    import subprocess

    ffmpeg = _resolve_ffmpeg()
    src_w, src_h = _probe_dimensions(raw)
    have_clip = raw.exists() and raw.stat().st_size > 64

    # Decide the crop window: face-centered when we can read pixels, else center.
    center_x: Optional[float] = None
    if have_clip:
        center_x = _smoothed_face_center_x(raw, src_w, src_h)

    if center_x is not None:
        crop_w, crop_h, x = _crop_window_from_center(center_x, src_w, src_h)
        mode = "active-speaker"  # dominant-face tracked (single-speaker MVP)
        geom_note = (
            f"MediaPipe face crop {crop_w}x{crop_h}@x={x} "
            f"(center {center_x / src_w:.3f} of width)"
        )
    else:
        crop_w, crop_h, x = _center_crop_geometry(src_w, src_h)
        mode = "center-fallback"
        geom_note = f"center crop {crop_w}x{crop_h}@x={x} (no face / no pixels)"

    # A single static keyframe describes the crop window. The Phase-2 animated
    # planner would emit many keyframes; the renderer/CropPlan shape is identical.
    keyframes = [CropKeyframe(t=0.0, x=x, width=crop_w)]
    vf = f"crop={crop_w}:{crop_h}:{x}:0,scale={TARGET_W}:{TARGET_H}"

    if not ffmpeg or not have_clip:
        # Graceful fallback: placeholder + logged intent, mock/CI stays green.
        intended = (
            f"ffmpeg -y -i {raw} -vf {vf} "
            f"-c:v libx264 -preset veryfast -crf 20 -c:a aac {vertical}"
        )
        vertical.write_bytes(b"FOCALDIVE_MOCK_VERTICAL\x00")
        print(f"    [no-ffmpeg] reframe skipped; intended: {intended}")
        return CropPlan(
            rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
            source_width=src_w, source_height=src_h, scene_cuts=[],
            keyframes=keyframes, vertical_path=str(vertical), mock=False,
            notes=f"ffmpeg/clip absent; wrote placeholder (intended: {geom_note}).",
        )

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
            f"CPU {geom_note} -> {TARGET_W}x{TARGET_H} via libx264 (no GPU). "
            "LR-ASD active-speaker + animated crop are the Phase-2 upgrade."
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
