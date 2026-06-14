"""Stage 6 — Animated karaoke captions (.ass) + burn-in.

For each clip, slice the per-word timing from ``transcript.json`` over the clip's
range, build an ASS subtitle file with karaoke ``\\k`` word-by-word highlight,
then burn it into ``clips/{n}_final.mp4`` (the deliverable, per CONTRACTS §5).

The ASS generation is pure text and fully tested offline (both modes). RTL text
(Arabic/Urdu) is supported: we set the ASS WrapStyle and emit a Unicode RTL
embedding so libass shapes it right-to-left.

Real branch (MOCK_MODE=false): burn-in via ffmpeg ``-c:v libx264`` (CPU, free,
NO nvenc/GPU) using the ``subtitles`` (libass) filter.
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

# Auto-emoji for configured keywords (subtle: at most one per line, see
# build_ass). Curated so it punches up without looking cheesy.
_EMOJI_KEYWORDS: dict[str, str] = {
    "money": "💰", "cash": "💰", "rich": "💰", "profit": "💰",
    "fire": "🔥", "insane": "🔥", "crazy": "🔥", "hot": "🔥",
    "fail": "💥", "mistake": "💥", "wrong": "💥",
    "love": "❤️", "heart": "❤️",
    "win": "🏆", "winner": "🏆", "best": "🏆", "success": "🏆",
    "secret": "🤫", "hack": "🤫",
    "important": "⭐", "key": "⭐", "huge": "⭐",
    "time": "⏰", "fast": "⚡", "speed": "⚡", "now": "⚡",
    "idea": "💡", "think": "💡", "smart": "🧠", "brain": "🧠",
    "growth": "📈", "grow": "📈", "up": "📈",
    "ai": "🤖", "robot": "🤖", "future": "🚀", "launch": "🚀",
}

# Alignment names → libass numpad codes (X-center column: 8 top, 5 mid, 2 bottom).
_ALIGNMENT_MAP: dict[str, int] = {"top": 8, "center": 5, "middle": 5, "bottom": 2}

# ── Named caption templates (the app's style picker maps onto these) ─────────
# Each is a full ASS style profile. The app sends {template, font,
# highlight_color, alignment}; _resolve_style merges that onto the chosen
# template so users can tweak font/colour/position without code.
TEMPLATES: dict[str, dict[str, Any]] = {
    # Big, chunky, UPPERCASE, 1–3 words on screen — the viral short-form look.
    "hormozi": {
        "font": "Arial",
        "font_size": 120,
        "bold": True,
        "primary_color": "&H00FFFFFF",     # white fill — AABBGGRR
        "highlight_color": "&H0000E6FF",    # active word: yellow #FFE600
        "outline_color": "&H00000000",      # black outline
        "outline": 8,
        "shadow": 3,
        "alignment": 5,                     # vertical center (opus-style)
        "margin_v": 40,
        "max_words_per_line": 3,
        "all_caps": True,                   # whole line uppercase
        "emoji": True,
    },
    # Sentence-case karaoke, ~5 words/line, white + colored sweep. Cleaner.
    "default": {
        "font": "Arial",
        "font_size": 84,
        "bold": True,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000E6FF",
        "outline_color": "&H00000000",
        "outline": 5,
        "shadow": 2,
        "alignment": 5,
        "margin_v": 60,
        "max_words_per_line": 5,
        "all_caps": False,
        "emoji": True,
    },
    # Minimal: lowercase, thin, no shout. For explainer/talking-head.
    "minimal": {
        "font": "Arial",
        "font_size": 72,
        "bold": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FFFFFF",    # no colour pop, just a bold sweep
        "outline_color": "&H00000000",
        "outline": 3,
        "shadow": 1,
        "alignment": 2,                     # bottom
        "margin_v": 220,
        "max_words_per_line": 5,
        "all_caps": False,
        "emoji": False,
    },
    # Neon: purple glow highlight for product/tech.
    "neon": {
        "font": "Arial",
        "font_size": 96,
        "bold": True,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00F755A8",    # purple #A855F7
        "outline_color": "&H00301040",
        "outline": 6,
        "shadow": 2,
        "alignment": 5,
        "margin_v": 40,
        "max_words_per_line": 3,
        "all_caps": True,
        "emoji": True,
    },
}

# Back-compat: the default template doubles as DEFAULT_STYLE for callers/tests.
DEFAULT_STYLE: dict[str, Any] = {**TEMPLATES["hormozi"]}

# Words that trigger per-word uppercase emphasis (when a line is NOT all_caps).
_EMPHASIS_WORDS = {
    "never", "always", "everyone", "nobody", "huge", "insane", "crazy",
    "best", "worst", "must", "free", "now", "stop", "wrong", "killer",
}


def _hex_to_ass_color(hex_color: str) -> str:
    """Convert a web ``#RRGGBB`` to an ASS ``&H00BBGGRR`` colour string.

    ASS colours are little-endian BGR with an alpha byte. Already-ASS values
    (starting ``&H``) pass through unchanged.
    """
    if not hex_color:
        return "&H00FFFFFF"
    if hex_color.startswith("&H") or hex_color.startswith("&h"):
        return hex_color
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return "&H00FFFFFF"
    rr, gg, bb = h[0:2], h[2:4], h[4:6]
    return f"&H00{bb}{gg}{rr}".upper()


def _resolve_style(raw: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Merge an app/JSON style onto its named template into a full ASS style.

    Accepts either a full pipeline style (the keys in TEMPLATES) or the web
    shape ``{template, font, highlight_color, alignment}``. The named template
    is the base; recognised overrides (font, highlight colour, alignment) are
    applied on top so the app's picker controls the look without code changes.
    """
    raw = raw or {}
    template_id = str(raw.get("template", "hormozi")).lower()
    base = dict(TEMPLATES.get(template_id, TEMPLATES["hormozi"]))

    # Full pipeline-style overrides (anything already in template shape wins).
    for k, v in raw.items():
        if k in base and k not in ("template",):
            base[k] = v

    # Web-shape conveniences: font name, highlight colour (#hex), alignment name.
    if raw.get("font"):
        base["font"] = raw["font"]
    if raw.get("highlight_color"):
        base["highlight_color"] = _hex_to_ass_color(str(raw["highlight_color"]))
    if raw.get("primary_color"):
        base["primary_color"] = _hex_to_ass_color(str(raw["primary_color"]))
    align = raw.get("alignment")
    if isinstance(align, str):
        base["alignment"] = _ALIGNMENT_MAP.get(align.lower(), base["alignment"])
    elif isinstance(align, int):
        base["alignment"] = align
    return base

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


def _resolve_ffmpeg() -> Optional[str]:
    """Resolve a runnable ffmpeg binary.

    Prefers ``settings.ffmpeg_path`` (bare name on PATH or a full path); falls
    back to ``shutil.which``. Returns ``None`` when ffmpeg is genuinely absent
    so the placeholder/copy fallback can keep mock/CI green.
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
        "; YT Shorts Clips karaoke captions\n"
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
        # Bold is -1 (on) / 0 (off) in ASS.
        f"Style: Karaoke,{style['font']},{style['font_size']},"
        f"{style['primary_color']},{style['highlight_color']},"
        f"{style['outline_color']},&H64000000,"
        f"{-1 if style.get('bold', True) else 0},0,0,0,"
        f"100,100,0,0,1,{style['outline']},{style['shadow']},"
        f"{style['alignment']},60,60,{style['margin_v']},1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )


def _bare(word: str) -> str:
    """Lowercased word with surrounding punctuation stripped (for keyword match)."""
    return word.strip(".,!?;:\"'—-").lower()


def _style_word(word: str, style: dict[str, Any]) -> str:
    """Apply caps decoration to a word's display text (emoji handled per-line).

    ``all_caps`` uppercases every word (Hormozi/neon). Otherwise individual
    high-energy words are uppercased for emphasis. Emoji are added once per line
    in :func:`build_ass`, not here, so a line never gets cluttered.
    """
    if style.get("all_caps"):
        return word.upper()
    if _bare(word) in _EMPHASIS_WORDS:
        return word.upper()
    return word


def _ass_escape(text: str) -> str:
    """Escape characters special to ASS dialogue text."""
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


# ── Auto-fit caption sizing (keep big text on-screen) ───────────────────────
PLAY_W = 1080  # ASS PlayResX (matches _ass_header)
# Horizontal safe area: leave a margin each side so text never kisses the edge.
SAFE_W = int(PLAY_W * 0.92)  # ~994 px usable
# Average glyph advance as a fraction of font size. Bold sans caps run wide;
# 0.62 is a deliberately CONSERVATIVE over-estimate so we never under-shrink and
# clip. (Real per-glyph metrics would need a font lib; this is dependency-free.)
_CHAR_W_FACTOR = 0.62
# Don't shrink below this many px or captions get unreadable; instead the text
# just gets the smallest allowed size (extreme single words are rare).
_MIN_FONT = 40


def _est_text_width(text: str, font_size: int) -> float:
    """Conservatively estimate rendered width (px) of ``text`` at ``font_size``.

    No font metrics: width ≈ chars × font_size × factor. Over-estimates so the
    fit check errs toward shrinking rather than clipping.
    """
    return len(text) * font_size * _CHAR_W_FACTOR


def _fit_font_size(text: str, base_size: int) -> int:
    """Largest font size ≤ ``base_size`` at which ``text`` fits ``SAFE_W``.

    Used per line so a long single word (e.g. NECESSARILY / COMPLICATED) shrinks
    just enough to fit instead of running off both edges. Floored at ``_MIN_FONT``.
    """
    if not text:
        return base_size
    if _est_text_width(text, base_size) <= SAFE_W:
        return base_size
    fitted = int(SAFE_W / (len(text) * _CHAR_W_FACTOR))
    return max(_MIN_FONT, min(base_size, fitted))


def _wrap_words_to_width(
    words: list[dict[str, Any]],
    render: "Any",
    base_size: int,
    max_words: int,
) -> list[list[dict[str, Any]]]:
    """Group words into lines that fit ``SAFE_W`` at ``base_size``.

    ``render(word)`` returns the displayed string for width measurement (caps +
    emoji applied). A line breaks when adding the next word would exceed the safe
    width OR ``max_words``. A single word wider than the safe area still gets its
    own line (it will be shrunk later by :func:`_fit_font_size`).
    """
    lines: list[list[dict[str, Any]]] = []
    cur: list[dict[str, Any]] = []
    cur_text = ""
    for w in words:
        disp = render(w)
        candidate = disp if not cur_text else f"{cur_text} {disp}"
        too_wide = _est_text_width(candidate, base_size) > SAFE_W
        too_many = len(cur) >= max_words
        if cur and (too_wide or too_many):
            lines.append(cur)
            cur, cur_text = [w], disp
        else:
            cur.append(w)
            cur_text = candidate
    if cur:
        lines.append(cur)
    return lines


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
    st = _resolve_style(style) if style is not None else dict(DEFAULT_STYLE)
    header = _ass_header(st, rtl)
    max_words = int(st.get("max_words_per_line", 5))
    base_size = int(st.get("font_size", 84))
    emoji_on = bool(st.get("emoji")) and not rtl  # keep RTL lines clean

    def _display(w: dict[str, Any], with_emoji: bool = False) -> str:
        """Displayed text for a word (caps applied; emoji only if asked)."""
        d = _style_word(str(w["word"]).strip(), st)
        if with_emoji and _bare(str(w["word"])) in _EMOJI_KEYWORDS:
            d = f"{d} {_EMOJI_KEYWORDS[_bare(str(w['word']))]}"
        return d

    # Wrap on WIDTH (not a fixed word count) so big text never runs off-screen.
    lines = _wrap_words_to_width(words, _display, base_size, max_words)

    events: list[str] = []
    for line_words in lines:
        if not line_words:
            continue
        line_start = max(0.0, float(line_words[0]["start"]) - clip_start)
        line_end = max(line_start, float(line_words[-1]["end"]) - clip_start)

        # At most one emoji per line: the first keyword word in the line gets it.
        emoji_idx = -1
        if emoji_on:
            for i, w in enumerate(line_words):
                if _bare(str(w["word"])) in _EMOJI_KEYWORDS:
                    emoji_idx = i
                    break

        # Per-line auto-shrink: measure the full rendered line (with its emoji)
        # and drop the font size if even this line is too wide (e.g. one very
        # long word). Applied as an inline {\fsNN} override so other lines stay big.
        line_text = " ".join(
            _display(w, with_emoji=(i == emoji_idx))
            for i, w in enumerate(line_words)
        )
        fitted_size = _fit_font_size(line_text, base_size)
        size_tag = f"{{\\fs{fitted_size}}}" if fitted_size != base_size else ""

        # Karaoke timing: ASS \k durations are CUMULATIVE from the line's Start
        # time and have NO concept of gaps. If we only emit each word's own
        # duration, any silence BETWEEN words is dropped and every later word
        # highlights too early — the sweep races ahead of the speech. So we add
        # the gap before each word into the timing: a leading unhighlighted
        # spacer ({\k<gap>}) holds the highlight until the word is actually
        # spoken, keeping the colour locked to the audio.
        tokens: list[str] = []
        prev_end = line_start  # line Start == first word start, so gap 0 there
        for i, w in enumerate(line_words):
            ws = max(0.0, float(w["start"]) - clip_start)
            we = max(ws, float(w["end"]) - clip_start)
            gap_cs = int(round(max(0.0, ws - prev_end) * 100))
            dur_cs = max(1, int(round((we - ws) * 100)))  # \k unit = centiseconds
            display = _ass_escape(_display(w, with_emoji=(i == emoji_idx)))
            spacer = f"{{\\k{gap_cs}}}" if gap_cs > 0 else ""
            # Separator space carries the prior word's trailing context; emit the
            # gap spacer (unhighlighted) then the highlighted word.
            sep = " " if i > 0 else ""
            tokens.append(f"{sep}{spacer}{{\\kf{dur_cs}}}{display}")
            prev_end = we

        text = size_tag + "".join(tokens)
        if rtl:
            # Explicit RTL embedding so libass shapes the line right-to-left.
            text = f"{_RLE}{text}{_PDF}"
        events.append(
            f"Dialogue: 0,{_ass_timestamp(line_start)},{_ass_timestamp(line_end)},"
            f"Karaoke,,0,0,0,,{text}"
        )

    return header + "\n".join(events) + "\n"


def _load_style(ws: Path) -> dict[str, Any]:
    """Load the app/job style from captions_style.json, else the default template.

    Returns the RAW style dict (web shape ``{template, font, highlight_color,
    alignment}`` or a full pipeline style); :func:`build_ass` resolves it onto a
    named template via :func:`_resolve_style`.
    """
    style_file = ws / "captions_style.json"
    if style_file.exists():
        try:
            return json.loads(style_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"template": "hormozi"}


def _words_in_range(segments: list[dict], start: float, end: float) -> list[dict]:
    out: list[dict] = []
    for seg in segments:
        for w in seg.get("words", []):
            if w["start"] < end and w["end"] > start:
                out.append(w)
    return out


def _load_caption_overrides(ws: Path) -> dict[str, Any]:
    """Load editor caption overrides from ``captions_override.json`` if present.

    Shape: ``{"<rank>": {"words": [{"word","start","end"}]}}`` with start/end in
    CLIP-RELATIVE seconds. Written by ``render_one.py`` from the inline editor's
    edited subtitle segments. Absent → ``{}`` (the transcript is used as before).
    """
    f = ws / "captions_override.json"
    if not f.exists():
        return {}
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _make_thumbnail(final: Path, thumb: Path, *, mock: bool) -> bool:
    """Grab a poster frame ~1s into the final clip via ffmpeg -> {n}_thumb.jpg.

    Returns True if a real jpg was written. In mock mode (or when ffmpeg/the
    final clip is unavailable) writes a tiny placeholder so the file exists and
    the gallery has something to request.
    """
    ffmpeg = _resolve_ffmpeg()
    if not mock and ffmpeg and final.exists() and final.stat().st_size > 1024:
        cmd = [
            ffmpeg, "-y", "-ss", "1", "-i", str(final),
            "-frames:v", "1", "-q:v", "3", str(thumb),
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            if thumb.exists() and thumb.stat().st_size > 0:
                return True
        except (subprocess.CalledProcessError, OSError):
            pass
    # Placeholder so /files/<n>_thumb.jpg resolves (1x1-ish marker, not a real jpg).
    thumb.write_bytes(b"\xff\xd8\xff\xe0FOCALDIVE_MOCK_THUMB")
    return False


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
    # Editor overrides (per-rank edited caption words, clip-relative seconds).
    overrides = _load_caption_overrides(ws)

    clips_dir = ws / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    results: list[CaptionResult] = []
    for rank, cand in enumerate(candidates, start=1):
        start, end = float(cand["start"]), float(cand["end"])
        # Prefer the editor's edited words for this rank; else slice the
        # transcript. Override words are clip-relative → shift to absolute so
        # build_ass (which re-bases by clip_start) yields the right timing.
        ov = overrides.get(str(rank)) or overrides.get(rank)
        if ov and ov.get("words"):
            words = [
                {
                    "word": str(w.get("word", "")),
                    "start": start + float(w.get("start", 0.0)),
                    "end": start + float(w.get("end", 0.0)),
                }
                for w in ov["words"]
                if str(w.get("word", "")).strip()
            ]
        else:
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

        # Poster frame for the gallery card (CONTRACTS §5 {n}_thumb.jpg).
        _make_thumbnail(final, clips_dir / f"{rank}_thumb.jpg", mock=settings.mock_mode)

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


def _escape_subtitles_path(path: Path) -> str:
    """Escape a path for ffmpeg's ``subtitles=`` filter argument.

    The filtergraph parser eats backslashes and treats ``:`` as an option
    separator, so on Windows ``C:\\x\\y.ass`` must become ``C\\:/x/y.ass``.
    The result is meant to be wrapped in single quotes inside the filter.
    """
    s = str(path).replace("\\", "/")   # backslashes -> forward slashes
    s = s.replace(":", "\\:")          # escape the drive-letter colon
    return s


def _burn_in(vertical: Path, ass_path: Path, final: Path, *, mock: bool) -> bool:
    """Burn the .ass into the vertical clip with libx264 (CPU, no nvenc).

    Returns True if ffmpeg actually ran. The encoder is always ``libx264`` on
    this free CPU path (h264_nvenc is the documented GPU upgrade). When ffmpeg
    is genuinely absent we copy/placeholder the final and log the intent so
    mock/CI stays green.
    """
    ffmpeg = _resolve_ffmpeg()
    # libass subtitles filter needs the path escaped for the filtergraph; point
    # fontsdir at the .ass directory so any bundled fonts resolve.
    ass_arg = _escape_subtitles_path(ass_path)
    fonts_arg = _escape_subtitles_path(ass_path.parent)
    vf = f"subtitles='{ass_arg}':fontsdir='{fonts_arg}'"
    cmd = [
        (ffmpeg or "ffmpeg"), "-y", "-i", str(vertical),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "copy", str(final),
    ]
    cmd_str = " ".join(cmd)

    if ffmpeg and vertical.exists() and vertical.stat().st_size > 64:
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
    parser = argparse.ArgumentParser(description="FD captions stage")
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
