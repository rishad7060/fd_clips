"""Free YouTube (and 1000+ sites) transcript fetch - NO API keys, NO download.

Given a video URL, pull its CAPTION track (manually-uploaded subtitles first, else
YouTube's auto-generated captions) using ``yt-dlp`` metadata extraction
(``extract_info(url, download=False)``) and fetch the timed-text track directly.
No video is downloaded, no paid API (Groq/Gemini) is touched - this is the $0
organic-SEO tool path, deliberately separate from the paid pipeline transcribe.py.

Reuses ``ingest._is_youtube`` so YouTube gets the android_vr-first ``player_client``
ladder (the caption tracks are exposed reliably without a PO token / JS runtime).

Always prints exactly ONE JSON line to stdout and exits 0 (even on error, where it
prints ``{"error": "...", "code": "..."}``) so the spawning caller (the NestJS
TranscriptController) always gets clean, parseable JSON - never a traceback.

Output shape on success:
    {
      "title": str, "channel": str, "duration": int, "video_id": str,
      "thumbnail": str, "language": "en", "auto_generated": bool,
      "available_languages": ["en", "es", ...],
      "segments": [{"start": 0.0, "dur": 2.4, "text": "..."}, ...],
      "text": "full plain-text transcript joined with spaces/newlines"
    }

Standalone:
    python pipeline/transcript.py --url "https://youtu.be/dQw4w9WgXcQ"
    python pipeline/transcript.py --url "<url>" --lang es
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any, Optional

try:  # package import (python -m pipeline.transcript / imported)
    from .ingest import _is_youtube
except ImportError:  # script import (python pipeline/transcript.py)
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ingest import _is_youtube  # type: ignore

# Preferred caption formats, best-first. json3 is the richest (per-event timing);
# srv1/srv3 and vtt are solid fallbacks. We ask yt-dlp for the track URL and fetch
# it ourselves, so we only need ONE of these to be present.
_FORMAT_PREFERENCE = ("json3", "srv3", "srv1", "vtt", "ttml")

_HTTP_TIMEOUT = 20


def _http_get(url: str) -> str:
    """GET a caption-track URL and return its body as text. Raises on failure."""
    req = urllib.request.Request(
        url,
        headers={
            # A real UA avoids the odd 403 on timedtext endpoints from bare clients.
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:  # noqa: S310
        return resp.read().decode("utf-8", errors="replace")


def _clean(text: str) -> str:
    """Collapse whitespace/newlines a caption event may carry into one clean line."""
    return re.sub(r"\s+", " ", text).strip()


def _parse_json3(body: str) -> list[dict[str, Any]]:
    """Parse YouTube's json3 timed-text into [{start,dur,text}] segments."""
    data = json.loads(body)
    segments: list[dict[str, Any]] = []
    for event in data.get("events") or []:
        segs = event.get("segs")
        if not segs:
            continue
        text = _clean("".join(s.get("utf8", "") for s in segs))
        if not text:
            continue
        start = float(event.get("tStartMs", 0)) / 1000.0
        dur = float(event.get("dDurationMs", 0)) / 1000.0
        segments.append({"start": round(start, 3), "dur": round(dur, 3), "text": text})
    return segments


def _parse_vtt(body: str) -> list[dict[str, Any]]:
    """Parse WebVTT / SRT-ish cue blocks into [{start,dur,text}] segments."""
    ts = r"(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})"
    cue_re = re.compile(rf"{ts}\s*-->\s*{ts}")

    def to_sec(h: str, m: str, s: str, ms: str) -> float:
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    segments: list[dict[str, Any]] = []
    lines = body.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        m = cue_re.search(lines[i])
        if not m:
            i += 1
            continue
        start = to_sec(m.group(1), m.group(2), m.group(3), m.group(4))
        end = to_sec(m.group(5), m.group(6), m.group(7), m.group(8))
        i += 1
        buf: list[str] = []
        while i < len(lines) and lines[i].strip() and not cue_re.search(lines[i]):
            # Strip VTT inline tags like <00:00:01.000><c> ... </c>.
            buf.append(re.sub(r"<[^>]+>", "", lines[i]))
            i += 1
        text = _clean(" ".join(buf))
        if text:
            segments.append(
                {"start": round(start, 3), "dur": round(max(0.0, end - start), 3), "text": text}
            )
    return segments


def _dedupe(segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """YouTube auto-captions repeat a rolling line across events; drop exact
    consecutive duplicates so the plain text reads once, not thrice."""
    out: list[dict[str, Any]] = []
    for seg in segments:
        if out and out[-1]["text"] == seg["text"]:
            continue
        out.append(seg)
    return out


def _pick_track(
    tracks: dict[str, Any], want_lang: Optional[str]
) -> tuple[Optional[str], Optional[list[dict[str, Any]]]]:
    """Choose a language key from a yt-dlp subtitles/automatic_captions dict.

    Preference: the requested language, else English (en / en-*), else the first
    available. Returns (lang_key, format_entries) or (None, None) when empty.
    """
    if not tracks:
        return None, None
    keys = list(tracks.keys())

    def find(pred) -> Optional[str]:
        return next((k for k in keys if pred(k)), None)

    chosen: Optional[str] = None
    if want_lang:
        chosen = find(lambda k: k == want_lang) or find(
            lambda k: k.lower().startswith(want_lang.lower())
        )
    if not chosen:
        chosen = find(lambda k: k == "en") or find(lambda k: k.lower().startswith("en"))
    if not chosen:
        chosen = keys[0]
    return chosen, tracks.get(chosen)


def _fetch_segments(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fetch + parse the best-format caption track from yt-dlp's per-lang entries."""
    by_ext = {e.get("ext"): e for e in entries if e.get("url")}
    for ext in _FORMAT_PREFERENCE:
        entry = by_ext.get(ext)
        if not entry:
            continue
        try:
            body = _http_get(entry["url"])
        except Exception:  # noqa: BLE001 - try the next format
            continue
        try:
            if ext == "json3":
                return _dedupe(_parse_json3(body))
            return _dedupe(_parse_vtt(body))
        except Exception:  # noqa: BLE001 - malformed; try the next format
            continue
    return []


def transcript(url: str, want_lang: Optional[str] = None) -> dict[str, Any]:
    """Fetch a free caption transcript for ``url``. Never raises.

    Returns the success shape (see module docstring) or ``{"error", "code"}``.
    Error codes: ``yt_dlp_missing``, ``extract_failed``, ``no_captions``,
    ``fetch_failed``.
    """
    try:
        import yt_dlp  # lazy import so importing this module stays cheap/safe
    except Exception as e:  # noqa: BLE001
        return {"error": f"yt-dlp unavailable: {e}", "code": "yt_dlp_missing"}

    base_opts: dict[str, Any] = {
        "quiet": True,
        "noprogress": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "socket_timeout": 20,
        "retries": 1,
    }
    # Same cookie seam as ingest/preview so private/age-gated captions work - AND,
    # increasingly, so a datacenter/VPS IP isn't bot-blocked ("Sign in to confirm
    # you're not a bot"). Two ways to supply cookies:
    #   YTDLP_COOKIES=/path/cookies.txt        - an exported cookies.txt, or
    #   YTDLP_COOKIES_FROM_BROWSER=chrome      - read from a logged-in browser.
    cookie_file = (os.environ.get("YTDLP_COOKIES") or "").strip()
    cookie_browser = (os.environ.get("YTDLP_COOKIES_FROM_BROWSER") or "").strip()
    have_cookies = bool((cookie_file and Path(cookie_file).is_file()) or cookie_browser)
    if cookie_file and Path(cookie_file).is_file():
        base_opts["cookiefile"] = cookie_file
    elif cookie_browser:
        base_opts["cookiesfrombrowser"] = (cookie_browser,)

    # YouTube-only: try a LADDER of player clients. android_vr exposes caption
    # tracks without a PO token / JS runtime; when a datacenter IP is bot-checked,
    # different clients (web_safari/tv/mweb) sometimes still slip through. Mirrors
    # ingest.py's 403/bot-resistant client ladder. Non-YouTube gets one default
    # attempt (the empty client list).
    if _is_youtube(url):
        client_attempts: list[list[str]] = [
            ["android_vr", "android", "ios", "web"],
            ["web_safari", "tv", "mweb"],
        ]
    else:
        client_attempts = [[]]

    info: dict[str, Any] = {}
    last_err: Optional[Exception] = None
    for clients in client_attempts:
        opts = dict(base_opts)
        if clients:
            opts["extractor_args"] = {"youtube": {"player_client": clients}}
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False) or {}
            last_err = None
            break
        except Exception as e:  # noqa: BLE001 - try the next client combo
            last_err = e
            el = str(e).lower()
            # An unsupported/invalid URL won't improve with another client.
            if "unsupported url" in el or "is not a valid url" in el:
                break
            continue

    if last_err is not None:
        low = str(last_err).lower()
        # A bot-check / login gate is the common VPS failure - name the cookie fix
        # explicitly so the operator knows exactly what to set.
        if (
            "sign in" in low or "not a bot" in low or "bot" in low
            or "login" in low or "cookies" in low or "403" in low or "forbidden" in low
        ):
            hint = (
                "YouTube is bot-blocking this server's IP. Set YTDLP_COOKIES to an "
                "exported cookies.txt (or YTDLP_COOKIES_FROM_BROWSER=chrome) so "
                "yt-dlp looks like a signed-in user."
                if not have_cookies
                else "YouTube rejected the request even with cookies - the cookie "
                "file may be stale/expired. Re-export a fresh cookies.txt from a "
                "logged-in YouTube session."
            )
            return {"error": hint, "code": "bot_check"}
        return {"error": str(last_err), "code": "extract_failed"}

    # A playlist/channel returns "entries"; take the first real video.
    if not info.get("duration") and isinstance(info.get("entries"), list):
        vids = [e for e in info["entries"] if isinstance(e, dict)]
        if vids:
            info = vids[0]

    manual = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}
    # Prefer human-uploaded subtitles; fall back to auto-generated captions.
    lang, entries = _pick_track(manual, want_lang)
    auto_generated = False
    if not entries:
        lang, entries = _pick_track(auto, want_lang)
        auto_generated = True
    if not entries:
        return {
            "error": "This video has no captions available.",
            "code": "no_captions",
        }

    segments = _fetch_segments(entries)
    if not segments:
        return {
            "error": "Captions exist but could not be fetched. Try again.",
            "code": "fetch_failed",
        }

    # Union of every language offered (manual + auto), sorted, for a lang picker.
    available = sorted({*manual.keys(), *auto.keys()})
    full_text = " ".join(s["text"] for s in segments)
    vid = str(info.get("id") or "")
    thumb = (
        f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
        if vid and re.fullmatch(r"[A-Za-z0-9_-]{11}", vid)
        else str(info.get("thumbnail") or "")
    )
    duration = info.get("duration")
    return {
        "title": str(info.get("title") or "Untitled"),
        "channel": str(info.get("uploader") or info.get("channel") or ""),
        "duration": int(duration) if isinstance(duration, (int, float)) else 0,
        "video_id": vid,
        "thumbnail": thumb,
        "language": lang or "",
        "auto_generated": auto_generated,
        "available_languages": available,
        "segments": segments,
        "text": full_text,
    }


def _main() -> None:
    parser = argparse.ArgumentParser(description="Free YouTube transcript (no keys, no download)")
    parser.add_argument("--url", required=True, help="Video URL")
    parser.add_argument("--lang", default=None, help="Preferred caption language (e.g. en, es)")
    args = parser.parse_args()

    result: Optional[dict[str, Any]] = None
    try:
        result = transcript(args.url, args.lang)
    except Exception as e:  # noqa: BLE001 - last-resort guard; still emit JSON
        result = {"error": str(e), "code": "unexpected"}
    # Transcripts are full of non-ASCII (quotes, emoji, other languages). A
    # Windows console defaults to cp1252 and would raise on write - reconfigure
    # stdout to UTF-8 (mirrors run.py) so the JSON line always emits cleanly.
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (AttributeError, ValueError):
        pass
    sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    _main()
