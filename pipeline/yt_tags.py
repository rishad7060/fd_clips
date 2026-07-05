"""Free YouTube tags/keywords extractor - NO API keys, NO download.

Given a video URL, return the tags (keywords) the uploader set on it, plus a few
useful metadata fields, using yt-dlp metadata extraction (extract_info,
download=False). No paid API is touched. Mirrors preview.py/transcript.py:
android_vr-first player_client ladder for YouTube, cookie seam, and ALWAYS prints
exactly one JSON line to stdout and exits 0 (even on error).

Output on success:
    {"title": str, "channel": str, "video_id": str, "thumbnail": str,
     "tags": ["...", ...], "categories": ["..."], "view_count": int}
On failure: {"error": "...", "code": "extract_failed" | "no_tags" | "yt_dlp_missing"}

Standalone:
    python pipeline/yt_tags.py --url "https://youtu.be/dQw4w9WgXcQ"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Optional

try:  # package import
    from .ingest import _is_youtube
except ImportError:  # script import
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ingest import _is_youtube  # type: ignore


def extract_tags(url: str) -> dict[str, Any]:
    """Return a video's tags + light metadata via yt-dlp. Never raises."""
    try:
        import yt_dlp  # lazy import
    except Exception as e:  # noqa: BLE001
        return {"error": f"yt-dlp unavailable: {e}", "code": "yt_dlp_missing"}

    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "noprogress": True,
        "skip_download": True,
        "socket_timeout": 20,
        "retries": 1,
    }
    if _is_youtube(url):
        ydl_opts["extractor_args"] = {
            "youtube": {"player_client": ["android_vr", "android", "ios", "web"]}
        }
    cookie_file = (os.environ.get("YTDLP_COOKIES") or "").strip()
    cookie_browser = (os.environ.get("YTDLP_COOKIES_FROM_BROWSER") or "").strip()
    if cookie_file and Path(cookie_file).is_file():
        ydl_opts["cookiefile"] = cookie_file
    elif cookie_browser:
        ydl_opts["cookiesfrombrowser"] = (cookie_browser,)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e), "code": "extract_failed"}

    if not info.get("duration") and isinstance(info.get("entries"), list):
        vids = [e for e in info["entries"] if isinstance(e, dict)]
        if vids:
            info = vids[0]

    tags = [t for t in (info.get("tags") or []) if isinstance(t, str) and t.strip()]
    categories = [c for c in (info.get("categories") or []) if isinstance(c, str)]
    vid = str(info.get("id") or "")
    thumb = (
        f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
        if vid and re.fullmatch(r"[A-Za-z0-9_-]{11}", vid)
        else str(info.get("thumbnail") or "")
    )
    result: dict[str, Any] = {
        "title": str(info.get("title") or "Untitled"),
        "channel": str(info.get("uploader") or info.get("channel") or ""),
        "video_id": vid,
        "thumbnail": thumb,
        "tags": tags,
        "categories": categories,
        "view_count": int(info.get("view_count") or 0),
    }
    if not tags:
        # Not an error per se - many videos have no public tags. Signal it so the
        # UI can show a friendly "this video has no public tags" message.
        result["code"] = "no_tags"
    return result


def _main() -> None:
    parser = argparse.ArgumentParser(description="Free YouTube tags extractor (no keys, no download)")
    parser.add_argument("--url", required=True, help="Video URL")
    args = parser.parse_args()

    result: Optional[dict[str, Any]] = None
    try:
        result = extract_tags(args.url)
    except Exception as e:  # noqa: BLE001
        result = {"error": str(e), "code": "unexpected"}
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (AttributeError, ValueError):
        pass
    sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    _main()
