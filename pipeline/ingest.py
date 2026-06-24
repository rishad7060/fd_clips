"""Stage 1 - Ingestion.

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
import os
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Optional

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
    # YouTube "most replayed" heatmap (from yt-dlp), when available: a list of
    # {start_time, end_time, value} where value is relative replay intensity
    # (0..1). Empty when the platform/video exposes no heatmap. Used by the
    # scorer to boost candidates over the most-rewatched moments.
    heatmap: list[dict[str, float]] = field(default_factory=list)
    view_count: Optional[int] = None

    def to_json(self) -> dict:
        return asdict(self)


def _resolve_tool(configured: str, default_name: str) -> Optional[str]:
    """Resolve an ffmpeg/ffprobe binary.

    Honors the configured path from settings (FFMPEG_PATH/FFPROBE_PATH) first -
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


_js_runtime_checked = False


def _ensure_js_runtime() -> Optional[str]:
    """Make sure a JS runtime (Deno) is on PATH for yt-dlp's YouTube extraction.

    Modern YouTube gates its format URLs behind an ``n``/``nsig`` JS challenge
    that yt-dlp can only solve with an external JavaScript runtime (its EJS
    solver uses **Deno**, not Node). Without one, extraction "succeeds" but the
    real formats are silently dropped - the job then dies with "Requested format
    is not available" / HTTP 403.

    A worker that spawned this process may have captured PATH *before* Deno was
    installed, and a freshly-winget-installed Deno lives in a non-PATH packages
    dir. So we look for ``deno`` on PATH first, then probe the common Windows
    install locations and prepend the winner's directory to ``os.environ`` -
    making it visible to the in-process yt-dlp regardless of how we were
    launched. Idempotent; the filesystem probe runs at most once per process.
    """
    global _js_runtime_checked
    found = shutil.which("deno")
    if found:
        return found
    if _js_runtime_checked:
        return None
    _js_runtime_checked = True

    candidates: list[Path] = []
    local = os.environ.get("LOCALAPPDATA", "")
    userprofile = os.environ.get("USERPROFILE", "")
    if local:
        base = Path(local) / "Microsoft" / "WinGet"
        candidates.append(base / "Links" / "deno.exe")
        pkgs = base / "Packages"
        if pkgs.is_dir():
            candidates.extend(pkgs.glob("DenoLand.Deno_*/deno.exe"))
    if userprofile:
        candidates.append(Path(userprofile) / ".deno" / "bin" / "deno.exe")

    for cand in candidates:
        if cand.is_file():
            os.environ["PATH"] = f"{cand.parent}{os.pathsep}{os.environ.get('PATH', '')}"
            return str(cand)
    return None


def _ffprobe_available() -> bool:
    return _ffprobe_bin() is not None


def _ffmpeg_available() -> bool:
    return _ffmpeg_bin() is not None


def _clean_range(
    process_range: Optional[tuple[float, float]],
) -> Optional[tuple[float, float]]:
    """Validate/normalize a (start, end) window, or None for the whole video.

    Returns None (whole video) when the range is absent or not a positive,
    well-ordered window (end > start >= 0) so a junk range never breaks ingest.
    """
    if not process_range:
        return None
    try:
        start, end = float(process_range[0]), float(process_range[1])
    except (TypeError, ValueError, IndexError):
        return None
    start = max(0.0, start)
    if end <= start:
        return None
    return start, end


def _is_url(source: str) -> bool:
    return source.startswith(("http://", "https://", "www."))


def _is_youtube(url: str) -> bool:
    """True for a YouTube watch/short/youtu.be URL (gets the android_vr tweak)."""
    u = url.lower()
    return ("youtube.com" in u) or ("youtu.be" in u)


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
    process_range: Optional[tuple[float, float]] = None,
) -> SourceMetadata:
    """Ingest ``source`` for ``job_id`` and return its normalized metadata.

    The metadata JSON is written to ``workspace/{job_id}/source.meta.json`` and a
    (real or placeholder) ``source.mp4`` is created in the same dir.

    ``process_range`` (start, end) in seconds, when set, limits ingest to that
    time window of the source ("Credit saver"): yt-dlp ``download_ranges`` for
    URLs, ffmpeg ``-ss``/``-to`` at the normalize step otherwise. Default (None)
    processes the whole video (current behavior).
    """
    settings = get_settings()
    ws = settings.workspace(job_id)
    out_path = ws / "source.mp4"
    inferred_type = source_type or ("url" if _is_url(source) else "file")
    window = _clean_range(process_range)

    if settings.mock_mode:
        meta = _ingest_mock(source, job_id, inferred_type, out_path)
    else:
        meta = _ingest_real(source, job_id, inferred_type, out_path, ws, window)

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
    source: str, job_id: str, source_type: str, out_path: Path, ws: Path,
    window: Optional[tuple[float, float]] = None,
) -> SourceMetadata:
    """Real ingest via yt-dlp + ffprobe + ffmpeg (runs on the GPU/full box).

    ``window`` (start, end) seconds, when set, limits ingest to that time range
    of the source: yt-dlp ``download_ranges`` for URLs (so only that window is
    downloaded), else ffmpeg ``-ss``/``-to`` at the normalize step. ``trimmed``
    tracks whether the download was already range-limited so we don't re-trim.
    """
    info: dict[str, Any] = {}  # yt-dlp metadata (heatmap/view_count); {} for local files
    trimmed_on_download = False
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
            # Platform-agnostic (yt-dlp supports 1000+ sites - YouTube, TikTok,
            # Instagram, X/Twitter, Vimeo, Facebook, direct mp4, …). Prefer SHARP
            # output: a ≤1080p video+audio merge first, then a single progressive
            # file. The final ``best`` catches sites (TikTok/IG/X) that only serve
            # ONE muxed stream so there's nothing to merge. Quality > the small
            # extra merge cost.
            "format": (
                "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/"
                "bestvideo[height<=1080]+bestaudio/"
                "bestvideo[height<=720]+bestaudio/"
                "best[height<=1080]/best"
            ),
            "outtmpl": str(download_target),
            "merge_output_format": "mp4",
            # A link like ...?v=ID&list=RD<ID> is a single video that ALSO carries
            # an auto-generated "Mix"/Radio playlist. Without this, yt-dlp walks the
            # whole mix - dragging in unrelated, often DRM-protected videos that
            # fail the job. Always fetch just the one video the user pasted.
            "noplaylist": True,
            "quiet": True,
            "noprogress": True,
            "socket_timeout": 30,
            "retries": 2,
        }
        if ffmpeg_dir:
            ydl_opts["ffmpeg_location"] = ffmpeg_dir
        # YouTube increasingly requires cookies ("Sign in to confirm you're not a
        # bot") for downloads from clean/datacenter IPs. Two ways to supply them:
        #   YTDLP_COOKIES=/path/cookies.txt        - an exported cookies file, or
        #   YTDLP_COOKIES_FROM_BROWSER=chrome      - read cookies straight from an
        #                                            installed, logged-in browser
        #                                            (chrome|edge|firefox|brave|...).
        # The browser route needs no manual export and is the easiest reliable fix.
        cookie_file = (os.environ.get("YTDLP_COOKIES") or "").strip()
        cookie_browser = (os.environ.get("YTDLP_COOKIES_FROM_BROWSER") or "").strip()
        if cookie_file and Path(cookie_file).is_file():
            ydl_opts["cookiefile"] = cookie_file
        elif cookie_browser:
            # yt-dlp expects a tuple: (browser, profile?, keyring?, container?)
            ydl_opts["cookiesfrombrowser"] = (cookie_browser,)
        # "Credit saver": when a process_range is set, download ONLY that window
        # (yt-dlp download_ranges) instead of the whole video - so a 2h podcast
        # trimmed to a 5-min window neither downloads nor transcribes the rest.
        # force_keyframes_at_cuts gives clean cut points. Marks the download as
        # already-trimmed so the normalize step doesn't trim a second time.
        if window is not None:
            w_start, w_end = window
            ydl_opts["download_ranges"] = yt_dlp.utils.download_range_func(
                None, [(w_start, w_end)]
            )
            ydl_opts["force_keyframes_at_cuts"] = True
            trimmed_on_download = True

        # YouTube gates high-res formats behind a JS runtime (nsig/n challenge), a
        # GVS PO token, SABR-only experiments, or DRM - depending on the player
        # CLIENT. Clients also differ in whether their media URLs survive the
        # actual download: YouTube increasingly returns "HTTP 403 Forbidden" at
        # DOWNLOAD time (after a clean extraction) for some clients/IPs. No single
        # client is reliable for long, so we try a LADDER of client combos and
        # accept the first that downloads. (Other sites ignore this key, so the
        # ladder is YouTube-only; non-YouTube gets a single default attempt.)
        if _is_youtube(source):
            # YouTube's format URLs are gated behind a JS (nsig) challenge that
            # yt-dlp can only solve with Deno on PATH - without it the formats
            # vanish and the download 403s. Ensure it's reachable before we try.
            runtime = _ensure_js_runtime()
            if runtime is None:
                print("  [ingest] WARNING: no JS runtime (deno) found - YouTube "
                      "formats may be missing. Install with: winget install "
                      "DenoLand.Deno")
            client_attempts: list[list[str]] = [
                # tv + web_safari are the most 403-resistant at download time
                # lately; android_vr keeps the full 1080p ladder w/o a PO token.
                ["tv", "web_safari", "android_vr"],
                ["android_vr", "ios", "android"],
                ["mweb", "web"],
            ]
        else:
            client_attempts = [[]]  # single attempt, no client override

        # If browser cookies are available, retrying WITH them is the strongest
        # 403/bot-check fix - so append a cookie'd pass as the final fallback.
        cookie_retry = bool(
            (cookie_file and Path(cookie_file).is_file()) or cookie_browser
        )

        last_err: Optional[Exception] = None
        info = {}
        for attempt_i, clients in enumerate(client_attempts):
            opts = dict(ydl_opts)
            if clients:
                opts["extractor_args"] = {"youtube": {"player_client": clients}}
            # Clean any partial download from a prior 403 attempt so the next
            # client starts fresh (avoids "file exists"/resume confusion).
            for leftover in ws.glob("download.*"):
                try:
                    leftover.unlink()
                except OSError:
                    pass
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    # extract_info(download=True) both downloads AND returns the
                    # metadata dict - which carries the "most replayed" heatmap
                    # and view_count. (ydl.download() would discard that.)
                    info = ydl.extract_info(source, download=True) or {}
                last_err = None
                break
            except Exception as e:  # noqa: BLE001 - try the next client combo
                last_err = e
                el = str(e).lower()
                # Only worth trying another client for 403/bot/format issues;
                # an unsupported URL or genuine "not found" won't improve.
                fatal = (
                    "unsupported url" in el
                    or "is not a valid url" in el
                    or "no video" in el
                )
                if fatal:
                    break
                print(f"  [ingest] attempt {attempt_i + 1} "
                      f"({clients or 'default'}) failed: {str(e)[:120]}")
                continue

        # Final fallback: one more pass WITH browser/file cookies if we have them
        # and every clientless/client attempt 403'd or bot-checked.
        if last_err is not None and cookie_retry:
            el = str(last_err).lower()
            if "403" in el or "forbidden" in el or "sign in" in el or "bot" in el:
                opts = dict(ydl_opts)
                opts["extractor_args"] = {
                    "youtube": {"player_client": ["tv", "web_safari", "android_vr"]}
                }
                for leftover in ws.glob("download.*"):
                    try:
                        leftover.unlink()
                    except OSError:
                        pass
                try:
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(source, download=True) or {}
                    last_err = None
                except Exception as e:  # noqa: BLE001
                    last_err = e

        if last_err is not None:
            e = last_err
            msg = str(e)
            low = msg.lower()
            if "unsupported url" in low or "no video" in low or "is not a valid url" in low:
                hint = (
                    "This URL isn't a supported video link. Paste a direct link to a "
                    "single video (YouTube, TikTok, Instagram, X/Twitter, Vimeo, "
                    "Facebook, or a direct .mp4) - not a channel, playlist, or homepage."
                )
            elif _is_youtube(source) and ("javascript" in low or "nsig" in low or "player" in low):
                hint = (
                    "YouTube extraction needs a JS runtime for this video. Install deno "
                    "(winget install DenoLand.Deno) so yt-dlp can extract it, or try a "
                    "different video / a local file."
                )
            elif "sign in" in low or "bot" in low or "age" in low or "private" in low or "login" in low:
                hint = (
                    "This video needs login/cookies (private, age-gated, or bot-checked - "
                    "common on Instagram/TikTok/private YouTube). Set "
                    "YTDLP_COOKIES_FROM_BROWSER=chrome (or edge/firefox) in .env to reuse "
                    "your logged-in browser's cookies, or set YTDLP_COOKIES to a cookies.txt."
                )
            elif _is_youtube(source) and ("403" in low or "forbidden" in low):
                hint = (
                    "YouTube blocked the download (HTTP 403) from this IP across every "
                    "player client. The most reliable fix is cookies: set "
                    "YTDLP_COOKIES_FROM_BROWSER=chrome (or edge/firefox) in .env to reuse "
                    "your logged-in browser's session, then retry. Updating yt-dlp "
                    "(pip install -U yt-dlp) or trying a different video can also help."
                )
            else:
                hint = (
                    "Couldn't fetch this video. Try a different/shorter PUBLIC video link, "
                    "or upload a local file instead."
                )
            raise RuntimeError(f"yt-dlp could not download {source}: {msg}. {hint}") from e
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
    # unnecessary - we only cut small segments later. If the download is already
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

    # "Credit saver": trim to [start,end] at normalize time when the download
    # itself wasn't already range-limited (local files, or non-URL sources). For
    # URLs the download_ranges download already produced just the window, so we
    # must NOT trim again. ``-ss``/``-to`` are placed BEFORE ``-i`` for fast,
    # keyframe-accurate input seeking; a stream-copy remux can't trim mid-GOP, so
    # a windowed copy is forced to re-encode for frame-accurate cut points.
    trim_args: list[str] = []
    if window is not None and not trimmed_on_download:
        w_start, w_end = window
        trim_args = ["-ss", f"{w_start:.3f}", "-to", f"{w_end:.3f}"]
        needs_reencode = True

    if needs_reencode:
        norm_cmd = [
            ffmpeg, "-y", *trim_args, "-i", str(downloaded),
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

    # "Most replayed" heatmap from yt-dlp (empty list when the video has none).
    # Normalize to plain floats so it round-trips cleanly through JSON.
    heatmap: list[dict[str, float]] = []
    for h in (info.get("heatmap") or []):
        try:
            heatmap.append({
                "start_time": float(h["start_time"]),
                "end_time": float(h["end_time"]),
                "value": float(h["value"]),
            })
        except (KeyError, TypeError, ValueError):
            continue
    view_count = info.get("view_count")
    if heatmap:
        print(f"  [ingest] captured 'most replayed' heatmap: {len(heatmap)} segments.")

    # Surface low-res sources loudly: a < 720p source upscales to a soft 9:16
    # clip (a 360p source becomes a ~200px-wide crop blown up to 1080 → blurry).
    # This is almost always a yt-dlp extraction problem (the high-res ladder was
    # gated behind a PO token / JS runtime / SABR experiment and we fell back to
    # the 360p mobile formats), NOT a crop bug. Print so it's diagnosable.
    src_h = int(vstream.get("height", 0))
    if 0 < src_h < 720:
        extra = (
            " YouTube likely gated the HD ladder; the android_vr client usually "
            "recovers 1080p. If this persists, set YTDLP_COOKIES_FROM_BROWSER."
            if source_type == "url" and _is_youtube(source)
            else " The source itself is low-res (or login-gated); a higher-quality "
            "link will look sharper."
        )
        print(
            f"  [ingest] WARNING: source is only {vstream.get('width')}x{src_h} "
            f"(<720p). Vertical clips will be upscaled and look soft.{extra}"
        )

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
        heatmap=heatmap,
        view_count=int(view_count) if isinstance(view_count, (int, float)) else None,
    )


def _main() -> None:
    parser = argparse.ArgumentParser(description="FD ingest stage")
    parser.add_argument("--source", default="mock://fixture-podcast",
                        help="URL or local file path (default: a mock placeholder)")
    parser.add_argument("--job-id", default="demo-job-0001")
    args = parser.parse_args()

    meta = ingest(args.source, args.job_id)
    print("Ingest complete (mock={}):".format(meta.mock))
    print(json.dumps(meta.to_json(), indent=2))


if __name__ == "__main__":
    _main()
