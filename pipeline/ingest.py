"""Stage 1 — Ingestion.

Accepts a YouTube/remote URL or a local file path and produces a normalized
H.264 source at ``workspace/{job_id}/source.mp4`` plus a ``source.meta.json``
describing it (duration, fps, resolution, codec).

Real branch (MOCK_MODE=false, on a GPU/full box):
    * URL  -> download best quality <= 1080p with ``yt-dlp``.
    * local path -> use as-is.
    * Run ``ffprobe`` to read metadata.
    * Normalize to H.264 / yuv420p / constant-fps mp4 with ``ffmpeg``.

Mock branch (MOCK_MODE=true, this offline dev box):
    * Never touches the network and never requires ffmpeg.
    * If a local source path is given and exists, it is copied to source.mp4.
      Otherwise a tiny placeholder ``source.mp4`` is written.
    * Emits deterministic canned metadata (matching the transcript fixture's
      142.4s duration) so downstream stages have something stable to read.

The returned ``SourceMetadata`` shape is identical in both modes.

Standalone:
    python pipeline/ingest.py                 # mock ingest of the fixture job
    python pipeline/ingest.py --source path   # mock-copy a local file
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

try:  # package import (python -m pipeline.ingest / imported by run.py)
    from .config import get_settings
except ImportError:  # script import (python pipeline/ingest.py)
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore


# Canned metadata for MOCK_MODE. Duration matches tests/fixtures/transcript.sample.json
# so the mock transcript and mock source agree on length.
_MOCK_DURATION = 142.4
_MOCK_FPS = 30.0
_MOCK_WIDTH = 1920
_MOCK_HEIGHT = 1080


@dataclass
class SourceMetadata:
    """Normalized description of an ingested source video."""

    job_id: str
    source_type: str          # "url" | "upload"/"file"
    source_input: str         # the original URL or local path
    source_path: str          # relative path to the normalized source.mp4
    duration: float           # seconds
    fps: float
    width: int
    height: int
    video_codec: str
    audio_codec: str
    mock: bool

    def to_json(self) -> dict:
        return asdict(self)


def _resolve_tool(configured: str, default_name: str) -> Optional[str]:
    """Resolve an ffmpeg/ffprobe binary.

    Honors the configured path from settings (FFMPEG_PATH/FFPROBE_PATH) first —
    a full path is used as-is if it exists, a bare name is looked up on PATH.
    Falls back to the default name on PATH. Returns None when unavailable.
    """
    if configured:
        p = Path(configured)
        if p.is_file():
            return str(p)
        found = shutil.which(configured)
        if found:
            return found
    return shutil.which(default_name)


def _ffprobe_bin() -> Optional[str]:
    return _resolve_tool(get_settings().ffprobe_path, "ffprobe")


def _ffmpeg_bin() -> Optional[str]:
    return _resolve_tool(get_settings().ffmpeg_path, "ffmpeg")


def _ffprobe_available() -> bool:
    return _ffprobe_bin() is not None


def _ffmpeg_available() -> bool:
    return _ffmpeg_bin() is not None


def _is_url(source: str) -> bool:
    return source.startswith(("http://", "https://", "www."))


def _probe_real(path: Path) -> dict:
    """Run ffprobe on a real file and return parsed stream/format info."""
    ffprobe = _ffprobe_bin() or "ffprobe"
    cmd = [
        ffprobe, "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", str(path),
    ]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def ingest(
    source: str,
    job_id: str,
    *,
    source_type: Optional[str] = None,
) -> SourceMetadata:
    """Ingest ``source`` for ``job_id`` and return its normalized metadata.

    The metadata JSON is written to ``workspace/{job_id}/source.meta.json`` and a
    (real or placeholder) ``source.mp4`` is created in the same dir.
    """
    settings = get_settings()
    ws = settings.workspace(job_id)
    out_path = ws / "source.mp4"
    inferred_type = source_type or ("url" if _is_url(source) else "file")

    if settings.mock_mode:
        meta = _ingest_mock(source, job_id, inferred_type, out_path)
    else:
        meta = _ingest_real(source, job_id, inferred_type, out_path, ws)

    (ws / "source.meta.json").write_text(
        json.dumps(meta.to_json(), indent=2), encoding="utf-8"
    )
    return meta


def _ingest_mock(
    source: str, job_id: str, source_type: str, out_path: Path
) -> SourceMetadata:
    """Offline ingest: copy a local file if present, else write a placeholder."""
    local = Path(source)
    if source_type == "file" and local.exists() and local.is_file():
        shutil.copyfile(local, out_path)
    else:
        # Tiny deterministic placeholder so the file exists for downstream stages.
        out_path.write_bytes(b"FOCALDIVE_MOCK_SOURCE\x00")

    return SourceMetadata(
        job_id=job_id,
        source_type=source_type,
        source_input=source,
        source_path=str(out_path.relative_to(out_path.parents[2]))
        if len(out_path.parents) >= 3
        else out_path.name,
        duration=_MOCK_DURATION,
        fps=_MOCK_FPS,
        width=_MOCK_WIDTH,
        height=_MOCK_HEIGHT,
        video_codec="h264",
        audio_codec="aac",
        mock=True,
    )


def _ingest_real(
    source: str, job_id: str, source_type: str, out_path: Path, ws: Path
) -> SourceMetadata:
    """Real ingest via yt-dlp + ffprobe + ffmpeg (runs on the GPU/full box)."""
    if source_type == "url":
        import yt_dlp  # imported lazily so MOCK_MODE never needs it

        # yt-dlp needs ffmpeg to MERGE separate video+audio streams. Point it at
        # our resolved binary (FFMPEG_PATH) and prefer a progressive single-file
        # format so a merge isn't even required when one is available. Bounded
        # timeouts/retries so a bad URL fails fast instead of hanging the worker.
        ffmpeg = _ffmpeg_bin()
        ffmpeg_dir = str(Path(ffmpeg).parent) if ffmpeg else None
        download_target = ws / "download.%(ext)s"
        ydl_opts = {
            # Prefer a ready-made <=1080p mp4 (no merge); fall back to merge.
            "format": "best[ext=mp4][height<=1080]/bestvideo[height<=1080]+bestaudio/best",
            "outtmpl": str(download_target),
            "merge_output_format": "mp4",
            "quiet": True,
            "noprogress": True,
            "socket_timeout": 30,
            "retries": 2,
        }
        if ffmpeg_dir:
            ydl_opts["ffmpeg_location"] = ffmpeg_dir
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([source])
        except Exception as e:  # noqa: BLE001 — surface a clear, actionable error
            raise RuntimeError(
                f"yt-dlp could not download {source}: {e}. Tip: some sites need a "
                f"JS runtime or cookies; try a local file, or a different/shorter video."
            ) from e
        downloaded = next(ws.glob("download.*"))
    else:
        downloaded = Path(source)
        if not downloaded.exists():
            raise FileNotFoundError(f"Local source not found: {source}")

    # Normalize to H.264 yuv420p constant-fps mp4.
    ffmpeg = _ffmpeg_bin()
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg is required for real ingest but was not found. Set FFMPEG_PATH "
            "in .env to the ffmpeg binary, or put it on PATH."
        )
    # ffmpeg cannot read and write the same file in place (it would truncate the
    # input mid-decode), so when the local source already lives at out_path we
    # normalize into a temp file and atomically replace it afterwards.
    norm_target = out_path
    if downloaded.resolve() == out_path.resolve():
        norm_target = out_path.with_name(out_path.stem + ".norm.mp4")

    # Re-encoding a whole (possibly hour-long) source on CPU is slow and usually
    # unnecessary — we only cut small segments later. If the download is already
    # H.264 / yuv420p, just remux (stream-copy: near-instant). Only re-encode
    # when the codec/pixfmt actually needs it (e.g. AV1/VP9 from YouTube).
    needs_reencode = True
    try:
        probe = _probe_real(downloaded)
        vstream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        if vstream.get("codec_name") == "h264" and vstream.get("pix_fmt") == "yuv420p":
            needs_reencode = False
    except (subprocess.CalledProcessError, StopIteration, KeyError, OSError):
        needs_reencode = True  # if we can't probe, be safe and re-encode

    if needs_reencode:
        norm_cmd = [
            ffmpeg, "-y", "-i", str(downloaded),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            "-c:a", "aac", "-movflags", "+faststart",
            str(norm_target),
        ]
    else:
        norm_cmd = [
            ffmpeg, "-y", "-i", str(downloaded),
            "-c", "copy", "-movflags", "+faststart", str(norm_target),
        ]
    subprocess.run(norm_cmd, check=True)
    if norm_target != out_path:
        out_path.unlink(missing_ok=True)
        norm_target.replace(out_path)

    probe = _probe_real(out_path)
    vstream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    astream = next(
        (s for s in probe["streams"] if s["codec_type"] == "audio"), {}
    )
    num, den = (vstream.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 30.0

    return SourceMetadata(
        job_id=job_id,
        source_type=source_type,
        source_input=source,
        source_path=str(out_path),
        duration=float(probe["format"].get("duration", 0.0)),
        fps=round(fps, 3),
        width=int(vstream.get("width", 0)),
        height=int(vstream.get("height", 0)),
        video_codec=vstream.get("codec_name", "h264"),
        audio_codec=astream.get("codec_name", "aac"),
        mock=False,
    )


def _main() -> None:
    parser = argparse.ArgumentParser(description="FocalDive ingest stage")
    parser.add_argument("--source", default="mock://fixture-podcast",
                        help="URL or local file path (default: a mock placeholder)")
    parser.add_argument("--job-id", default="demo-job-0001")
    args = parser.parse_args()

    meta = ingest(args.source, args.job_id)
    print("Ingest complete (mock={}):".format(meta.mock))
    print(json.dumps(meta.to_json(), indent=2))


if __name__ == "__main__":
    _main()
