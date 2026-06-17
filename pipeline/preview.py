"""Lightweight video-preview metadata (no download).

Given a video URL, extract just enough metadata to show a PREVIEW on the config
screen (a thumbnail + title + resolution badge like Opus's "4K") WITHOUT
downloading the video. Uses ``yt-dlp`` ``extract_info(url, download=False)`` —
fast, metadata-only.

Reuses ``ingest._is_youtube`` so the **android_vr**-first ``player_client`` ladder
is applied for YouTube (so we see the real max resolution, not a 360p fallback).

Always prints exactly ONE JSON line to stdout and exits 0 (even on error, where it
prints ``{"error": "..."}``) so the spawning caller always gets clean, parseable
JSON instead of a stack trace / non-zero exit.

Standalone:
    python pipeline/preview.py --url "https://youtu.be/dQw4w9WgXcQ"
        -> {"title": "...", "thumbnail": "...", "duration": 213, "width": 1920, "height": 1080}
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Optional

try:  # package import (python -m pipeline.preview / imported)
    from .ingest import _is_youtube
except ImportError:  # script import (python pipeline/preview.py)
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ingest import _is_youtube  # type: ignore


def _best_height(info: dict[str, Any]) -> tuple[int, int]:
    """Best (width, height) across the top-level fields and the formats ladder.

    yt-dlp's top-level width/height reflect a single chosen format and can be a
    low-res fallback; scanning ``formats`` for the tallest video stream recovers
    the true max resolution (e.g. android_vr's 1080p/4K ladder).
    """
    width = int(info.get("width") or 0)
    height = int(info.get("height") or 0)
    for f in info.get("formats") or []:
        # vcodec "none" means audio-only; skip those.
        if f.get("vcodec") in (None, "none"):
            continue
        fh = int(f.get("height") or 0)
        if fh > height:
            height = fh
            width = int(f.get("width") or 0)
    return width, height


def _pick_thumbnail(info: dict[str, Any]) -> str:
    """A usable thumbnail URL: the top-level one, else the largest in the list."""
    thumb = info.get("thumbnail")
    if isinstance(thumb, str) and thumb:
        return thumb
    best = ""
    best_area = -1
    for t in info.get("thumbnails") or []:
        url = t.get("url")
        if not url:
            continue
        area = int(t.get("width") or 0) * int(t.get("height") or 0)
        # Prefer the largest; thumbnails with no dims (area 0) still beat nothing.
        if area >= best_area:
            best_area = area
            best = url
    return best


def preview(url: str) -> dict[str, Any]:
    """Extract preview metadata for ``url`` via yt-dlp (download=False).

    Returns ``{title, thumbnail, duration, width, height}`` on success, or
    ``{"error": "..."}`` on any failure. Never raises.
    """
    try:
        import yt_dlp  # imported lazily so importing this module is cheap/safe
    except Exception as e:  # noqa: BLE001
        return {"error": f"yt-dlp unavailable: {e}"}

    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "noprogress": True,
        "skip_download": True,
        "socket_timeout": 20,
        "retries": 1,
        # Metadata only — don't probe the full formats with extra network calls
        # we don't need; we still get the formats ladder for the height scan.
        "extract_flat": False,
    }
    # YouTube-only: the android_vr client exposes the full 360→1080→4K ladder with
    # no PO token / JS runtime, so the resolution badge reflects the REAL max.
    if _is_youtube(url):
        ydl_opts["extractor_args"] = {
            "youtube": {"player_client": ["android_vr", "android", "ios", "web"]}
        }
    # Reuse the same cookie seam as ingest so private/age-gated previews work when
    # the operator has configured cookies (otherwise they cleanly error below).
    cookie_file = (os.environ.get("YTDLP_COOKIES") or "").strip()
    cookie_browser = (os.environ.get("YTDLP_COOKIES_FROM_BROWSER") or "").strip()
    if cookie_file and Path(cookie_file).is_file():
        ydl_opts["cookiefile"] = cookie_file
    elif cookie_browser:
        ydl_opts["cookiesfrombrowser"] = (cookie_browser,)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}
    except Exception as e:  # noqa: BLE001 — return clean JSON, never a traceback
        return {"error": str(e)}

    # A playlist/channel returns "entries" instead of a single video; take the
    # first entry so a pasted playlist link still previews something.
    if not info.get("duration") and isinstance(info.get("entries"), list):
        entries = [e for e in info["entries"] if isinstance(e, dict)]
        if entries:
            info = entries[0]

    width, height = _best_height(info)
    duration = info.get("duration")
    return {
        "title": str(info.get("title") or "Untitled"),
        "thumbnail": _pick_thumbnail(info),
        "duration": int(duration) if isinstance(duration, (int, float)) else 0,
        "width": width,
        "height": height,
    }


def _main() -> None:
    parser = argparse.ArgumentParser(description="FD video-preview metadata (no download)")
    parser.add_argument("--url", required=True, help="Video URL to preview")
    args = parser.parse_args()

    result: Optional[dict[str, Any]] = None
    try:
        result = preview(args.url)
    except Exception as e:  # noqa: BLE001 — last-resort guard; still emit JSON
        result = {"error": str(e)}
    # Exactly one JSON line on stdout; exit 0 so the caller always parses cleanly.
    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    _main()
