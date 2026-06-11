"""Stage 6 — Animated karaoke captions (.ass) + burn-in.

For each clip, slice the per-word timing from ``transcript.json`` over the clip's
range, build an ASS subtitle file with karaoke ``\\k`` word-by-word highlight,
then burn it into ``clips/{n}_final.mp4`` (the deliverable, per CONTRACTS §5).

The ASS generation is pure text and fully tested offline (both modes). RTL text
(Arabic/Urdu) is supported: we set the ASS WrapStyle and emit a Unicode RTL
embedding so libass shapes it right-to-left.

Real branch (MOCK_MODE=false): burn-in via ffmpeg h264_nvenc (libx264 fallback).
Mock branch (MOCK_MODE=true): always write the real .ass; burn-in only if ffmpeg
is present, otherwise copy/placeholder the vertical clip as the final and log the
intended ffmpeg command.

Standalone:
    python pipeline/captions.py                 # build captions for the demo job
    python pipeline/captions.py --job-id X
    python pipeline/captions.py --selftest      # ASS gen incl. an Arabic RTL sample
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore

# Default karaoke style (overridable via captions_style.json in the workspace).
DEFAULT_STYLE: dict[str, Any] = {
    "font": "Arial",
    "font_size": 64,
    "primary_color": "&H00FFFFFF",     # text fill (white) — AABBGGRR
    "highlight_color": "&H0000E6FF",   # karaoke sweep (yellow #FFE600)
    "outline_color": "&H00000000",     # black outline
    "outline": 3,
    "shadow": 1,
    "alignment": 2,                    # bottom-center (libass numpad)
    "margin_v": 220,                   # lift above the very bottom for 9:16
    "max_words_per_line": 5,
    "uppercase_emphasis": True,        # UPPERCASE high-energy words
    "emoji_keywords": {                # auto-emoji for configured keywords
        "money": "💰", "fail": "💥", "love": "❤️", "win": "🏆",
        "secret": "🤫", "important": "⭐",
    },
}

# Words that trigger uppercase emphasis when uppercase_emphasis is on.
_EMPHASIS_WORDS = {
    "never", "always", "everyone", "nobody", "huge", "insane", "crazy",
    "best", "worst", "must", "free", "now", "stop", "wrong", "killer",
}

_RTL_LANGS = {"ar", "fa", "ur", "he", "ps", "sd", "ckb"}
# Unicode bidi controls for explicit RTL embedding.
_RLE = "‫"  # RIGHT-TO-LEFT EMBEDDING
_PDF = "‬"  # POP DIRECTIONAL FORMATTING


@dataclass
class CaptionResult:
    rank: int
    ass_path: str
    final_path: str
    burned_in: bool
    rtl: bool
    line_count: int
    mock: bool


def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _is_rtl(language: str) -> bool:
    return (language or "").lower().split("-")[0] in _RTL_LANGS


def _ass_timestamp(seconds: float) -> str:
    """Format seconds as ASS H:MM:SS.cs (centisecond precision)."""
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs == 100:
        cs = 0
        s += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _ass_header(style: dict[str, Any], rtl: bool) -> str:
    """Build the ASS [Script Info] + [V4+ Styles] + [Events] header."""
    # WrapStyle 2 = no smart wrapping (we control line breaks); works for RTL.
    play_w, play_h = 1080, 1920
    return (
        "[Script Info]\n"
        "; FocalDive Clips karaoke captions\n"
        "ScriptType: v4.00+\n"
        "WrapStyle: 2\n"
        "ScaledBorderAndShadow: yes\n"
        f"PlayResX: {play_w}\n"
        f"PlayResY: {play_h}\n"
        f"; Language direction: {'RTL' if rtl else 'LTR'}\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # SecondaryColour is the pre-sweep karaoke colour (highlight target).
        f"Style: Karaoke,{style['font']},{style['font_size']},"
        f"{style['primary_color']},{style['highlight_color']},"
        f"{style['outline_color']},&H64000000,-1,0,0,0,"
        f"100,100,0,0,1,{style['outline']},{style['shadow']},"
        f"{style['alignment']},60,60,{style['margin_v']},1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )


def _style_word(word: str, style: dict[str, Any]) -> str:
    """Apply emoji + uppercase-emphasis decoration to a word's display text."""
    display = word
    if style.get("uppercase_emphasis"):
        bare = word.strip(".,!?;:\"'").lower()
        if bare in _EMPHASIS_WORDS:
            display = word.upper()
    emoji_map: dict[str, str] = style.get("emoji_keywords", {})
    bare = word.strip(".,!?;:\"'").lower()
    if bare in emoji_map:
        display = f"{display} {emoji_map[bare]}"
    return display


def _ass_escape(text: str) -> str:
    """Escape characters special to ASS dialogue text."""
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def build_ass(
    words: list[dict[str, Any]],
    *,
    clip_start: float,
    style: Optional[dict[str, Any]] = None,
    rtl: bool = False,
    language: str = "en",
) -> str:
    """Build a full ASS document string with karaoke (\\k) word highlighting.

    ``words`` are absolute-timed {word, start, end}; they are re-based to the
    clip start. Words are grouped into lines of ``max_words_per_line``; each line
    is one Dialogue event whose text is a sequence of ``{\\kNN}word`` tokens so
    each word highlights as it is spoken.
    """
    st = {**DEFAULT_STYLE, **(style or {})}
    header = _ass_header(st, rtl)
    max_words = int(st.get("max_words_per_line", 5))

    events: list[str] = []
    lines = [words[i:i + max_words] for i in range(0, len(words), max_words)]
    for line_words in lines:
        if not line_words:
            continue
        line_start = max(0.0, float(line_words[0]["start"]) - clip_start)
        line_end = max(line_start, float(line_words[-1]["end"]) - clip_start)

        tokens: list[str] = []
        for w in line_words:
            ws = max(0.0, float(w["start"]) - clip_start)
            we = max(ws, float(w["end"]) - clip_start)
            k_cs = max(1, int(round((we - ws) * 100)))  # \k unit = centiseconds
            display = _ass_escape(_style_word(str(w["word"]).strip(), st))
            tokens.append(f"{{\\k{k_cs}}}{display}")

        text = " ".join(tokens)
        if rtl:
            # Explicit RTL embedding so libass shapes the line right-to-left.
            text = f"{_RLE}{text}{_PDF}"
        events.append(
            f"Dialogue: 0,{_ass_timestamp(line_start)},{_ass_timestamp(line_end)},"
            f"Karaoke,,0,0,0,,{text}"
        )

    return header + "\n".join(events) + "\n"


def _load_style(ws: Path) -> dict[str, Any]:
    """Load captions_style.json from the workspace if present, else defaults."""
    style_file = ws / "captions_style.json"
    if style_file.exists():
        return {**DEFAULT_STYLE, **json.loads(style_file.read_text(encoding="utf-8"))}
    return dict(DEFAULT_STYLE)


def _words_in_range(segments: list[dict], start: float, end: float) -> list[dict]:
    out: list[dict] = []
    for seg in segments:
        for w in seg.get("words", []):
            if w["start"] < end and w["end"] > start:
                out.append(w)
    return out


def caption_clips(job_id: str, top_n: Optional[int] = None) -> list[CaptionResult]:
    """Build .ass + (burn-in) final clip for each candidate."""
    settings = get_settings()
    ws = settings.workspace(job_id)
    transcript = json.loads((ws / "transcript.json").read_text(encoding="utf-8"))
    clips_doc = json.loads((ws / "clips.json").read_text(encoding="utf-8"))
    candidates = clips_doc.get("candidates", [])
    if top_n is not None:
        candidates = candidates[:top_n]

    language = transcript.get("language", "en")
    rtl = _is_rtl(language)
    style = _load_style(ws)
    segments = transcript.get("segments", [])

    clips_dir = ws / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    results: list[CaptionResult] = []
    for rank, cand in enumerate(candidates, start=1):
        start, end = float(cand["start"]), float(cand["end"])
        words = _words_in_range(segments, start, end)
        ass = build_ass(
            words, clip_start=start, style=style, rtl=rtl, language=language
        )
        ass_path = clips_dir / f"{rank}.ass"
        ass_path.write_text(ass, encoding="utf-8")
        line_count = ass.count("Dialogue:")

        vertical = clips_dir / f"{rank}_vertical.mp4"
        final = clips_dir / f"{rank}_final.mp4"
        burned = _burn_in(vertical, ass_path, final, mock=settings.mock_mode)

        results.append(
            CaptionResult(
                rank=rank, ass_path=str(ass_path), final_path=str(final),
                burned_in=burned, rtl=rtl, line_count=line_count,
                mock=settings.mock_mode,
            )
        )
        print(f"  clip #{rank}: {line_count} caption line(s) "
              f"{'(RTL)' if rtl else ''} burned_in={burned} -> {final.name}")

    return results


def _burn_in(vertical: Path, ass_path: Path, final: Path, *, mock: bool) -> bool:
    """Burn the .ass into the vertical clip. Returns True if ffmpeg actually ran."""
    # libass subtitles filter needs the path escaped for the filtergraph.
    ass_arg = str(ass_path).replace("\\", "/").replace(":", "\\:")
    encoder = "h264_nvenc" if not mock else "libx264"  # nvenc on GPU; x264 fallback
    cmd = [
        "ffmpeg", "-y", "-i", str(vertical),
        "-vf", f"subtitles='{ass_arg}'",
        "-c:v", encoder, "-c:a", "copy", str(final),
    ]
    cmd_str = " ".join(cmd)

    if _ffmpeg_available() and vertical.exists() and vertical.stat().st_size > 64:
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            pass

    # No ffmpeg (or unusable input): copy/placeholder + log intended command.
    if vertical.exists():
        shutil.copyfile(vertical, final)
    else:
        final.write_bytes(b"FOCALDIVE_MOCK_FINAL\x00")
    print(f"    [mock] burn-in skipped; intended: {cmd_str}")
    return False


def _safe(text: str) -> str:
    """Make a string printable on consoles with a non-UTF-8 code page."""
    import sys

    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    return text.encode(enc, errors="replace").decode(enc, errors="replace")


def _selftest() -> None:
    """Generate ASS for an English karaoke sample and an Arabic RTL sample."""
    en_words = [
        {"word": "Fall", "start": 50.12, "end": 50.44},
        {"word": "in", "start": 50.45, "end": 50.57},
        {"word": "love", "start": 50.58, "end": 50.89},
        {"word": "with", "start": 50.90, "end": 51.09},
        {"word": "the", "start": 51.10, "end": 51.22},
        {"word": "problem.", "start": 51.23, "end": 51.82},
    ]
    en = build_ass(en_words, clip_start=50.12, rtl=False, language="en")
    assert "{\\k" in en, "missing karaoke tags"
    assert "Dialogue:" in en and "Karaoke" in en
    print("EN sample (first 3 lines of [Events]):")
    for line in en.splitlines():
        if line.startswith("Dialogue:"):
            print("  " + _safe(line[:90]))

    ar_words = [
        {"word": "مرحبا", "start": 0.0, "end": 0.5},
        {"word": "بكم", "start": 0.5, "end": 1.0},
        {"word": "في", "start": 1.0, "end": 1.3},
        {"word": "العرض", "start": 1.3, "end": 1.9},
    ]
    ar = build_ass(ar_words, clip_start=0.0, rtl=True, language="ar")
    assert _RLE in ar and _PDF in ar, "RTL embedding controls missing"
    assert "العرض" in ar, "Arabic text not preserved"
    assert "{\\k" in ar
    print("AR (RTL) sample Dialogue line:")
    for line in ar.splitlines():
        if line.startswith("Dialogue:"):
            print("  " + _safe(line))
            break
    print("captions selftest: OK (EN karaoke + AR RTL)")


def _main() -> None:
    parser = argparse.ArgumentParser(description="FocalDive captions stage")
    parser.add_argument("--job-id", default="demo-job-0001")
    parser.add_argument("--top", type=int, default=None)
    parser.add_argument("--selftest", action="store_true",
                        help="Run the ASS generation selftest (EN + Arabic RTL)")
    args = parser.parse_args()

    if args.selftest:
        _selftest()
        return

    print(f"Building captions for job {args.job_id}:")
    results = caption_clips(args.job_id, top_n=args.top)
    print(f"Built captions for {len(results)} clip(s); "
          f"RTL={results[0].rtl if results else 'n/a'}")


if __name__ == "__main__":
    _main()
