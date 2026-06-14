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
from dataclasses import asdict, dataclass, field
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
# Lower confidence so distant / profile / turned-away faces (the off-camera
# speaker on a zoomed-out two-shot) still register — they're what we widen for.
FACE_MIN_CONFIDENCE = 0.3   # MediaPipe min detection confidence

# ── Per-shot framing (opus.pro-style) ───────────────────────────────────────
# A new "shot" begins when the frame-to-frame mean-abs difference exceeds this
# fraction of full scale (0..1). Higher = fewer cuts. ~0.30 catches hard cuts
# between cameras without splitting on motion/lighting.
SCENE_CUT_THRESHOLD = 0.30
SCENE_MIN_SHOT_SEC = 0.8    # ignore cuts that would make a shot shorter than this
# Vertical face placement: the face center sits this fraction down from the top
# of the 9:16 window (upper third = ~0.33 → short-form-native composition with
# headroom above and caption space below).
FACE_VERTICAL_ANCHOR = 0.36

# ── Time-windowed follow + two-shot widen ───────────────────────────────────
# The crop is recomputed per short time window (not per whole shot) so it can
# follow a face as the camera zooms/pans within one continuous angle.
WINDOW_SEC = 1.2            # length of each framing window in seconds
# When two faces in a window are separated by more than this fraction of frame
# width, widen the crop to include BOTH (so the off-centre speaker isn't cut on
# a zoomed-out two-shot). Below it, tight-frame the dominant face.
TWO_SHOT_SPREAD = 0.22
TWO_SHOT_MARGIN = 0.10     # extra width padding around the two faces (frac of W)
# EMA smoothing of the window-to-window crop center & width (calm pan/zoom, no
# whip). Reset on a scene cut so a real angle change snaps instantly.
PATH_EMA_ALPHA = 0.4
# Min fraction of frames in a window that must contain >=2 faces before we treat
# it as a genuine two-shot (debounces a single stray second detection).
TWO_SHOT_MIN_FRAC = 0.4


@dataclass
class CropKeyframe:
    """One keyframe of the virtual camera path."""

    t: float       # seconds, relative to clip start
    x: int         # left edge of the crop window in source pixels
    width: int     # crop window width
    y: int = 0     # top edge of the crop window in source pixels
    height: int = 0  # crop window height (0 = full source height, legacy)


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
        keyframes.append(CropKeyframe(t=t, x=x, width=width, y=0, height=SRC_H))

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
# (Only short_range is reliably hosted; the off-centre/distant speaker is instead
# recovered by upscaling frames before detection — see ``_sample_faces``.)
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
    list[tuple[cx, cy, area, score]]`` (one entry per detected face; cx/cy are
    the box-center fractions 0..1 of frame width/height, area is the box-area
    fraction, score is detection confidence), and ``closer()`` releases any
    resources. Returns ``None`` when no usable detector can be constructed.

    Tier 1: the classic ``mp.solutions.face_detection`` API (no model file).
    Tier 2: the newer Tasks ``FaceDetector`` (needs a cached .tflite model).
    """
    # ── Tier 1: classic solutions API (preferred — no model download) ──
    solutions = getattr(mp, "solutions", None)
    if solutions is not None and hasattr(solutions, "face_detection"):
        det = solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=FACE_MIN_CONFIDENCE
        )

        def detect_classic(rgb: Any) -> list[tuple[float, float, float, float]]:
            res = det.process(rgb)
            out: list[tuple[float, float, float, float]] = []
            for d in res.detections or []:
                box = d.location_data.relative_bounding_box
                cx = box.xmin + box.width / 2.0
                cy = box.ymin + box.height / 2.0
                area = max(0.0, box.width) * max(0.0, box.height)
                score = d.score[0] if d.score else 0.0
                out.append((cx, cy, area, score))
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

    def detect_tasks(rgb: Any) -> list[tuple[float, float, float, float]]:
        h, w = rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = det.detect(mp_image)
        out: list[tuple[float, float, float, float]] = []
        for d in res.detections or []:
            bb = d.bounding_box  # pixel coords
            cx = (bb.origin_x + bb.width / 2.0) / max(1, w)
            cy = (bb.origin_y + bb.height / 2.0) / max(1, h)
            area = (bb.width / max(1, w)) * (bb.height / max(1, h))
            score = d.categories[0].score if d.categories else 0.0
            out.append((cx, cy, area, score))
        return out

    return detect_tasks, det.close


@dataclass
class FaceSample:
    """One sampled frame's faces (fractions 0..1 of frame).

    ``cx``/``cy`` are the *dominant* face center (largest box) for backward-compat
    and tight framing; ``faces`` holds *every* detected face center so a window
    can widen to keep two far-apart speakers in frame. Empty ``faces`` (cx<0)
    means no face this frame.
    """

    t: float            # seconds, relative to clip start
    cx: float           # dominant face center x as fraction of width (-1 = none)
    cy: float           # dominant face center y as fraction of height (-1 = none)
    is_cut: bool        # True if a scene cut was detected at/just before this frame
    faces: list[tuple[float, float]] = field(default_factory=list)  # (cx,cy) all faces


def _sample_faces(raw: Path) -> Optional[list[FaceSample]]:
    """Sample the clip with MediaPipe, returning per-frame dominant-face positions.

    Opens ``raw`` with OpenCV and, on every ``FRAME_SAMPLE_STRIDE``-th frame,
    runs MediaPipe face detection and records the *dominant* face's center (x and
    y, as fractions of frame size) tagged with the frame timestamp. It also flags
    scene cuts by comparing each sampled frame to the previous one (mean absolute
    difference over a downscaled grayscale frame) — a cheap, dependency-free
    stand-in for PySceneDetect so the crop can re-frame per shot.

    Returns the list of samples (ordered by time), or ``None`` when OpenCV /
    MediaPipe is unavailable or can't open the clip. An empty list means the clip
    decoded but no face was found in any sample (caller centers the crop).

    Heavy/paid-ish deps (cv2, mediapipe, numpy) are imported lazily *inside* this
    real-branch helper so the mock path stays import-free.
    """
    # PHASE 2: replace the single-largest-face heuristic with LR-ASD
    # active-speaker tracking so the crop follows the *talker* per shot — see
    # fd_clips_v2.md Part 5.
    try:
        import cv2  # lazy: real branch only
        import numpy as np  # lazy: real branch only
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

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    if fps <= 1e-3:
        fps = 30.0

    samples: list[FaceSample] = []
    prev_small: Any = None
    try:
        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % FRAME_SAMPLE_STRIDE != 0:
                frame_idx += 1
                continue
            t = frame_idx / fps
            frame_idx += 1

            # Scene-cut detection: mean-abs-diff vs the previous sampled frame on
            # a tiny grayscale thumbnail (cheap, robust to small motion).
            small = cv2.resize(
                cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (64, 36)
            ).astype(np.float32) / 255.0
            is_cut = False
            if prev_small is not None:
                diff = float(np.mean(np.abs(small - prev_small)))
                is_cut = diff > SCENE_CUT_THRESHOLD
            prev_small = small

            # MediaPipe expects contiguous RGB.
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = detect_fn(rgb)  # [(cx, cy, area, score), ...]
            if not faces:
                # Still record the cut so a faceless shot boundary isn't lost,
                # but mark no face (cx/cy = -1 → treated as "use neighbours").
                if is_cut:
                    samples.append(FaceSample(t=t, cx=-1.0, cy=-1.0, is_cut=True))
                continue

            # Dominant face = largest box area; tie-break on detection score.
            cx, cy = _dominant_face_xy(faces)
            # Keep every face center (clamped) so a window can widen to two-shot.
            all_centers = [
                (min(1.0, max(0.0, fx)), min(1.0, max(0.0, fy)))
                for (fx, fy, _a, _s) in faces
            ]
            samples.append(
                FaceSample(
                    t=t,
                    cx=min(1.0, max(0.0, cx)),
                    cy=min(1.0, max(0.0, cy)),
                    is_cut=is_cut,
                    faces=all_centers,
                )
            )
    finally:
        cap.release()
        try:
            close_fn()
        except Exception:
            pass

    face_count = sum(1 for s in samples if s.cx >= 0.0)
    cut_count = sum(1 for s in samples if s.is_cut)
    print(f"    [reframe] sampled {len(samples)} frame(s); "
          f"{face_count} with a face, {cut_count} scene cut(s).")
    return samples


def _dominant_face_xy(
    faces: list[tuple[float, float, float, float]],
) -> tuple[float, float]:
    """Pick the dominant face and return its (cx, cy) center fractions.

    Dominant = largest box area, breaking ties on detection score. Each face is
    ``(cx, cy, area, score)`` from ``_make_face_detector``.
    """
    cx, cy, _area, _score = max(faces, key=lambda f: (f[2], f[3]))
    return cx, cy


def _median(vals: list[float]) -> float:
    """Median of a non-empty list."""
    s = sorted(vals)
    mid = len(s) // 2
    return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2.0


def _window_target(
    win: list["FaceSample"],
) -> Optional[tuple[float, float, float]]:
    """Compute a window's desired framing as (center_x, center_y, width) fractions.

    Looks at every face in the window (not just the dominant one). If two or more
    faces are spread horizontally by more than ``TWO_SHOT_SPREAD`` in a sufficient
    share of frames, returns a WIDER window spanning both (so a zoomed-out
    two-shot keeps the off-centre speaker). Otherwise returns a tight window on
    the dominant (median) face. ``None`` when the window has no faces at all.
    """
    framed = [s for s in win if s.cx >= 0.0]
    if not framed:
        return None

    # Horizontal extent of all faces per frame; a frame is "two-shot" when its
    # faces span more than TWO_SHOT_SPREAD of the width.
    two_shot_frames = 0
    all_left: list[float] = []
    all_right: list[float] = []
    for s in framed:
        xs = [fx for (fx, _fy) in s.faces] or [s.cx]
        lo, hi = min(xs), max(xs)
        all_left.append(lo)
        all_right.append(hi)
        if len(xs) >= 2 and (hi - lo) > TWO_SHOT_SPREAD:
            two_shot_frames += 1

    is_two_shot = two_shot_frames >= max(1, int(TWO_SHOT_MIN_FRAC * len(framed)))
    cy = _median([s.cy for s in framed])

    if is_two_shot:
        # Span both extremes (median of per-frame extremes = robust to a stray).
        left = _median(all_left)
        right = _median(all_right)
        center_x = (left + right) / 2.0
        width = min(1.0, (right - left) + 2 * TWO_SHOT_MARGIN)
        return center_x, cy, width

    # Tight single-face framing on the dominant (median) center.
    center_x = _median([s.cx for s in framed])
    return center_x, cy, 0.0  # width 0 → caller uses the base 9:16 width


def _build_keyframes(
    samples: list["FaceSample"], clip_duration: float, src_w: int, src_h: int
) -> list[CropKeyframe]:
    """Turn per-frame samples into a smoothed, time-windowed crop path.

    Bins samples into ``WINDOW_SEC`` windows; each window gets a desired
    (center_x, center_y, width) from :func:`_window_target` (which widens for
    two-shots). The path's center and width are EMA-smoothed window-to-window so
    pans/zooms are calm, and the smoothing RESETS on a scene cut so a real angle
    change snaps. Each window becomes one ``CropKeyframe`` (x, y, width, height),
    9:16-correct and clamped to the frame.

    Returns ``[]`` when no window has a face (caller centers the crop).
    """
    if not samples:
        return []

    base_w, base_h, _ = _center_crop_geometry(src_w, src_h)
    aspect = base_w / base_h  # 9:16 width/height ratio for this source

    n_windows = max(1, int(round(clip_duration / WINDOW_SEC)))
    win_len = clip_duration / n_windows

    keyframes: list[CropKeyframe] = []
    last_cx: Optional[float] = None
    last_w: Optional[float] = None  # smoothed width fraction (of src_w)

    for i in range(n_windows):
        w0 = i * win_len
        w1 = (i + 1) * win_len if i < n_windows - 1 else clip_duration + 1e-3
        win = [s for s in samples if w0 <= s.t < w1]
        cut_in_window = any(s.is_cut for s in win if s.t > 1e-6)

        target = _window_target(win)
        if target is None:
            # No face this window: hold last framing, else center.
            if last_cx is None:
                continue
            cx_frac, cy_frac, want_w = last_cx, FACE_VERTICAL_ANCHOR, last_w or (base_w / src_w)
        else:
            cx_frac, cy_frac, want_w_frac = target
            want_w = want_w_frac if want_w_frac > 0 else (base_w / src_w)

        # Reset smoothing on a hard cut so the camera snaps to the new angle.
        if cut_in_window:
            last_cx, last_w = None, None

        if last_cx is None:
            sm_cx, sm_w = cx_frac, want_w
        else:
            sm_cx = PATH_EMA_ALPHA * cx_frac + (1 - PATH_EMA_ALPHA) * last_cx
            sm_w = PATH_EMA_ALPHA * want_w + (1 - PATH_EMA_ALPHA) * last_w
        last_cx, last_w = sm_cx, sm_w

        crop_w, crop_h, x, y = _window_to_window_px(
            sm_cx, cy_frac, sm_w, aspect, src_w, src_h
        )
        keyframes.append(
            CropKeyframe(t=round(w0, 3), x=x, y=y, width=crop_w, height=crop_h)
        )

    # Collapse consecutive identical windows so the ffmpeg expr stays small.
    collapsed: list[CropKeyframe] = []
    for kf in keyframes:
        if collapsed and (kf.x, kf.y, kf.width, kf.height) == (
            collapsed[-1].x, collapsed[-1].y, collapsed[-1].width, collapsed[-1].height
        ):
            continue
        collapsed.append(kf)
    return collapsed


# ── Wide two-shot detection (blur-pad fallback) ─────────────────────────────
# When the speaker sits far to one side of a WIDE frame for most of the clip,
# a tight 9:16 crop leaves them looking at empty space and drops the (often
# undetectable) conversation partner. In that case we fit the whole frame into
# 9:16 with a blurred background instead — nobody is cut off.
# A face is "off to a side" when its center is past this distance from the
# middle (0.18 ≈ outside the central ~64%). 0.50 of frames being off-side marks
# a clip where the subject lives near an edge — a tight crop would frame them
# against empty space / drop the off-screen partner.
WIDE_SHOT_MIN_ASPECT = 1.7   # only for genuinely wide (≈16:9+) sources
# Blur-pad is a LAST RESORT (it letterboxes the whole frame). Like Opus, we
# default to a TIGHT face-following crop and only blur-pad when BOTH people in a
# real two-shot are on screen at once, too far apart for one 9:16 crop to hold —
# i.e. genuinely simultaneous two-face frames with a large horizontal spread.
TWO_FACE_SPREAD_PAD = 0.45   # two faces must span > this fraction of width
TWO_FACE_FRAC_PAD = 0.55     # ...in at least this share of FRAMED samples


def _is_wide_two_shot(
    samples: list["FaceSample"], src_w: int, src_h: int
) -> bool:
    """True ONLY for a genuine wide two-shot a tight crop can't hold.

    A single off-centre face is NOT a two-shot — we just tight-crop to it (that's
    what Opus does). Blur-pad fires only when TWO faces are detected
    simultaneously AND span a large fraction of the (wide) frame for most of the
    clip — the rare case where one 9:16 crop would drop a person mid-conversation.
    """
    if src_h == 0 or (src_w / src_h) < WIDE_SHOT_MIN_ASPECT:
        return False
    framed = [s for s in samples if s.cx >= 0.0]
    if len(framed) < 6:
        return False
    wide_two = 0
    for s in framed:
        if len(s.faces) >= 2:
            xs = [f[0] for f in s.faces]
            if (max(xs) - min(xs)) > TWO_FACE_SPREAD_PAD:
                wide_two += 1
    return (wide_two / len(framed)) >= TWO_FACE_FRAC_PAD


def _blur_pad_vf() -> str:
    """ffmpeg filtergraph: fit the full frame into 9:16 over a blurred fill.

    The background is the source scaled to COVER 1080x1920 and heavily blurred;
    the foreground is the full source scaled to FIT the width, centered. Keeps
    both people visible (letterbox-style) without hard black bars.
    """
    return (
        f"split[bg][fg];"
        f"[bg]scale={TARGET_W}:{TARGET_H}:force_original_aspect_ratio=increase,"
        f"crop={TARGET_W}:{TARGET_H},gblur=sigma=28[bgb];"
        f"[fg]scale={TARGET_W}:-2[fgs];"
        f"[bgb][fgs]overlay=(W-w)/2:(H-h)/2"
    )


def _window_to_window_px(
    cx_frac: float, cy_frac: float, w_frac: float, aspect: float,
    src_w: int, src_h: int,
) -> tuple[int, int, int, int]:
    """Resolve a window's (center_x, center_y, width-frac) into a px crop window.

    Width is the requested fraction of source width (≥ the base 9:16 width),
    capped at the source; height = width/aspect keeps 9:16, capped at source
    height (which then re-caps width to stay 9:16). Centered horizontally on the
    face(s); face anchored to the upper third vertically. Even dims for libx264.
    """
    base_w, _bh, _ = _center_crop_geometry(src_w, src_h)
    crop_w = max(base_w, int(round(w_frac * src_w)))
    crop_w = min(crop_w, src_w)
    crop_h = int(round(crop_w / aspect))
    if crop_h > src_h:
        crop_h = src_h
        crop_w = int(round(crop_h * aspect))
    crop_w -= crop_w % 2
    crop_h -= crop_h % 2

    face_x = cx_frac * src_w
    face_y = cy_frac * src_h
    x = int(round(face_x - crop_w / 2.0))
    y = int(round(face_y - crop_h * FACE_VERTICAL_ANCHOR))
    x = max(0, min(src_w - crop_w, x))
    y = max(0, min(src_h - crop_h, y))
    return crop_w, crop_h, x, y


def _reframe_real(
    rank: int, start: float, end: float, speakers: list[str],
    raw: Path, vertical: Path,
) -> CropPlan:
    """v2 MVP reframe: time-windowed face-follow (+ two-shot widen) -> 9:16.

    Opus.pro-style composition on the free CPU path:
      1. Sample the raw clip (~every 5th frame) with MediaPipe, recording EVERY
         face's center per frame + detecting scene cuts by frame-difference.
      2. Bin samples into short time windows (WINDOW_SEC). Per window: if two
         faces are spread far apart (a zoomed-out two-shot), WIDEN the window to
         keep both; else tight-frame the dominant face. Centers/widths are
         EMA-smoothed window-to-window (calm pan/zoom) and reset on scene cuts.
      3. Because ffmpeg's ``crop`` evaluates w/h only once, we render at a FIXED
         window sized to the widest moment (so a two-shot is never cut) and
         animate x/y to follow the action, then ``scale=1080:1920`` on libx264.

    Fallbacks: faceless windows hold the last framing; when OpenCV/MediaPipe
    can't run we center-crop; when ffmpeg is absent we write a placeholder so
    mock/CI stays green.

    # PHASE 2: smooth per-frame virtual camera (sendcmd) + LR-ASD active-speaker
    # (follow the *talker*, not the biggest face) + h264_nvenc — see fd_clips_v2.
    """
    import subprocess

    ffmpeg = _resolve_ffmpeg()
    src_w, src_h = _probe_dimensions(raw)
    have_clip = raw.exists() and raw.stat().st_size > 64
    clip_duration = max(0.1, end - start)
    crop_w, crop_h, center_x = _center_crop_geometry(src_w, src_h)
    center_y = max(0, (src_h - crop_h) // 2)

    samples = _sample_faces(raw) if have_clip else None

    mode = "center-fallback"
    geom_note = f"center crop {crop_w}x{crop_h}@x={center_x} (no face / no pixels)"

    # ── Wide two-shot → blur-pad the whole frame (nobody cropped out) ──────
    if samples and _is_wide_two_shot(samples, src_w, src_h):
        vf = _blur_pad_vf()
        mode = "fit-blur-pad"
        keyframes = [CropKeyframe(t=0.0, x=0, y=0, width=src_w, height=src_h)]
        geom_note = (
            "wide two-shot: blur-padded full frame into 9:16 (both people kept)"
        )
        if not ffmpeg or not have_clip:
            vertical.write_bytes(b"FOCALDIVE_MOCK_VERTICAL\x00")
            print(f"    [no-ffmpeg] reframe skipped; intended blur-pad: {vf}")
            return CropPlan(
                rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
                source_width=src_w, source_height=src_h, scene_cuts=[],
                keyframes=keyframes, vertical_path=str(vertical), mock=False,
                notes=f"ffmpeg/clip absent; wrote placeholder ({geom_note}).",
            )
        cmd = [
            ffmpeg, "-y", "-i", str(raw), "-filter_complex", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", str(vertical),
        ]
        subprocess.run(cmd, check=True)
        print(f"    [reframe] {geom_note}")
        return CropPlan(
            rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
            source_width=src_w, source_height=src_h, scene_cuts=[],
            keyframes=keyframes, vertical_path=str(vertical), mock=False,
            notes=f"CPU {geom_note} -> {TARGET_W}x{TARGET_H} via libx264 (no GPU).",
        )

    # Time-windowed follow + two-shot widen → a smoothed crop path.
    keyframes = _build_keyframes(samples, clip_duration, src_w, src_h) if samples else []

    if not keyframes:
        # No usable face data anywhere → single centered window.
        keyframes = [CropKeyframe(t=0.0, x=center_x, y=center_y,
                                  width=crop_w, height=crop_h)]
        mode = "center-fallback"
    else:
        widened = any(kf.width > crop_w for kf in keyframes)
        if len(keyframes) == 1:
            mode = "two-shot" if widened else "active-speaker"
        else:
            mode = "two-shot-follow" if widened else "face-follow"

    # ffmpeg's crop evaluates w/h ONCE at init but x/y PER FRAME. So we use a
    # FIXED crop window = the widest any keyframe needs (guarantees a two-shot is
    # never cut), and animate only x/y to follow the action. Height tracks that
    # fixed width to stay 9:16. The (smaller) per-window widths still drive the
    # path's x so single-face moments stay centered within the wider window.
    fixed_w = max(kf.width for kf in keyframes)
    fixed_w = min(fixed_w, src_w)
    fixed_w -= fixed_w % 2
    fixed_h = min(src_h, int(round(fixed_w * TARGET_H / TARGET_W)))
    fixed_h -= fixed_h % 2
    # Re-clamp each keyframe's x/y to the fixed window so it always fits.
    fixed_kfs: list[CropKeyframe] = []
    for kf in keyframes:
        # Re-center the fixed window on this keyframe's window center.
        kf_cx = kf.x + kf.width / 2.0
        kf_cy = kf.y + kf.height / 2.0
        nx = int(round(kf_cx - fixed_w / 2.0))
        ny = int(round(kf_cy - fixed_h / 2.0))
        nx = max(0, min(src_w - fixed_w, nx))
        ny = max(0, min(src_h - fixed_h, ny))
        fixed_kfs.append(CropKeyframe(t=kf.t, x=nx, y=ny, width=fixed_w, height=fixed_h))
    # Collapse identical consecutive frames after re-clamping.
    keyframes = []
    for kf in fixed_kfs:
        if keyframes and (kf.x, kf.y) == (keyframes[-1].x, keyframes[-1].y):
            continue
        keyframes.append(kf)
    crop_w, crop_h = fixed_w, fixed_h

    scene_cuts = [kf.t for kf in keyframes if kf.t > 1e-6]
    geom_note = (
        f"{len(keyframes)} keyframe(s); fixed {crop_w}x{crop_h} window "
        f"follows face(s), upper-third anchor ({mode})"
    )
    x_expr = _keyframes_to_ffmpeg_expr(keyframes, "x")
    y_expr = _keyframes_to_ffmpeg_expr(keyframes, "y")
    if len(keyframes) == 1:
        kf = keyframes[0]
        vf = (f"crop={crop_w}:{crop_h}:{kf.x}:{kf.y},"
              f"scale={TARGET_W}:{TARGET_H}")
    else:
        # Time-switched crop: x/y change at window boundaries (piecewise-constant).
        vf = (f"crop={crop_w}:{crop_h}:x='{x_expr}':y='{y_expr}',"
              f"scale={TARGET_W}:{TARGET_H}")

    if not ffmpeg or not have_clip:
        # Graceful fallback: placeholder + logged intent, mock/CI stays green.
        intended = (
            f"ffmpeg -y -i {raw} -vf \"{vf}\" "
            f"-c:v libx264 -preset veryfast -crf 20 -c:a aac {vertical}"
        )
        vertical.write_bytes(b"FOCALDIVE_MOCK_VERTICAL\x00")
        print(f"    [no-ffmpeg] reframe skipped; intended: {intended}")
        return CropPlan(
            rank=rank, mode=mode, target_width=TARGET_W, target_height=TARGET_H,
            source_width=src_w, source_height=src_h, scene_cuts=scene_cuts,
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
        source_width=src_w, source_height=src_h, scene_cuts=scene_cuts,
        keyframes=keyframes, vertical_path=str(vertical), mock=False,
        notes=(
            f"CPU {geom_note} -> {TARGET_W}x{TARGET_H} via libx264 (no GPU). "
            "LR-ASD active-speaker + smooth pan are the Phase-2 upgrade."
        ),
    )


def _keyframes_to_ffmpeg_expr(keyframes: list[CropKeyframe], axis: str) -> str:
    """Piecewise-constant ffmpeg crop expression on time ``t`` for x or y.

    ``axis`` is ``"x"`` or ``"y"``. Each shot holds its window until the next
    shot's start time, so the crop snaps to the new framing on each scene cut
    (no interpolation — matches the per-shot composition we computed).
    """
    if not keyframes:
        return "0"
    val = (lambda kf: kf.x) if axis == "x" else (lambda kf: kf.y)
    expr = str(val(keyframes[-1]))
    for kf in reversed(keyframes[:-1]):
        expr = f"if(lt(t,{kf.t + 0.0001:.4f}),{val(kf)},{expr})"
    return expr


def _main() -> None:
    parser = argparse.ArgumentParser(description="FD vertical reframe stage")
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
