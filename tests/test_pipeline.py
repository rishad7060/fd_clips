"""Offline (MOCK_MODE) tests for the YT Shorts Clips pipeline.

Run:  python -m pytest tests/test_pipeline.py -q
All tests force MOCK_MODE so they run with no GPU, no ffmpeg, and no API keys.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "pipeline"))

# Force mock mode before any pipeline import resolves settings.
os.environ["MOCK_MODE"] = "true"

import config  # noqa: E402
import captions  # noqa: E402
import extract  # noqa: E402
import ingest  # noqa: E402
import reframe  # noqa: E402
import run as run_mod  # noqa: E402
import score_clips  # noqa: E402
import transcribe  # noqa: E402

config.get_settings.cache_clear()
SETTINGS = config.get_settings()

MIN_CLIP = score_clips.MIN_CLIP_SEC
MAX_CLIP = score_clips.MAX_CLIP_SEC


@pytest.fixture()
def job_id(tmp_path, monkeypatch) -> str:
    """Isolate each test in its own workspace under tmp_path."""
    monkeypatch.setenv("WORKSPACE_DIR", str(tmp_path / "ws"))
    config.get_settings.cache_clear()
    yield "test-job-0001"
    config.get_settings.cache_clear()


def test_mock_mode_active() -> None:
    assert config.get_settings().mock_mode is True


def test_ingest_emits_metadata(job_id: str) -> None:
    meta = ingest.ingest("mock://podcast", job_id)
    assert meta.mock is True
    assert meta.duration > 0
    assert meta.width == 1920 and meta.height == 1080
    ws = config.get_settings().workspace(job_id)
    assert (ws / "source.mp4").exists()
    assert (ws / "source.meta.json").exists()


def test_transcribe_matches_contract(job_id: str) -> None:
    ingest.ingest("mock://podcast", job_id)
    t = transcribe.transcribe(job_id)
    assert t["job_id"] == job_id
    assert {"language", "duration", "segments"} <= set(t)
    seg = t["segments"][0]
    assert {"text", "start", "end", "speaker", "words"} <= set(seg)
    w = seg["words"][0]
    assert {"word", "start", "end"} <= set(w)


def _score(job_id: str, top=None):
    ingest.ingest("mock://podcast", job_id)
    transcribe.transcribe(job_id)
    return score_clips.score_clips(job_id, top_n=top)


def test_score_shape_and_bounds(job_id: str) -> None:
    result = _score(job_id)
    assert result["model"] == "mock-heuristic-v1"
    assert len(result["candidates"]) >= 5, "need >=5 clips for the demo summary"
    for c in result["candidates"]:
        assert {"start", "end", "hook_line", "virality_score",
                "reason", "suggested_title"} <= set(c)
        assert 0 <= c["virality_score"] <= 100
        assert c["end"] > c["start"]
        assert c["end"] - c["start"] <= MAX_CLIP + 1e-6


def test_score_sorted_desc(job_id: str) -> None:
    cands = _score(job_id)["candidates"]
    scores = [c["virality_score"] for c in cands]
    assert scores == sorted(scores, reverse=True)


def test_score_deduped_no_major_overlap(job_id: str) -> None:
    cands = _score(job_id)["candidates"]
    for i, a in enumerate(cands):
        for b in cands[i + 1:]:
            assert score_clips._overlap_fraction(a, b) <= 0.5 + 1e-9


def test_score_deterministic(job_id: str) -> None:
    first = _score(job_id)
    second = _score(job_id)
    assert first == second


def test_extract_creates_raw_clips(job_id: str) -> None:
    _score(job_id, top=5)
    results = extract.extract_clips(job_id, top_n=5)
    assert len(results) == 5
    ws = config.get_settings().workspace(job_id)
    for r in results:
        assert Path(r.raw_path).exists()
        assert "ffmpeg" in r.command  # intended command always logged


def test_reframe_plans_vertical(job_id: str) -> None:
    _score(job_id, top=5)
    extract.extract_clips(job_id, top_n=5)
    plans = reframe.reframe_clips(job_id, top_n=5)
    assert len(plans) == 5
    for p in plans:
        assert p.target_width == 1080 and p.target_height == 1920
        assert p.keyframes, "crop plan must have keyframes"
        assert p.mode in {"active-speaker", "two-face", "center-fallback"}


def _two_shot_window(left_open, right_open):
    """Build a 10-sample two-shot window: LEFT face at x=0.25, RIGHT at x=0.75.

    ``left_open(i)``/``right_open(i)`` give each face's mouth openness per sample.
    """
    return [
        reframe.FaceSample(
            t=i * 0.12, cx=0.25, cy=0.4, is_cut=False,
            faces=[(0.25, 0.4, left_open(i)), (0.75, 0.4, right_open(i))],
        )
        for i in range(10)
    ]


def test_active_speaker_crops_to_talker() -> None:
    """ASD: when one face's lips move and the other's are still, crop to the talker."""
    talk = lambda i: 0.1 + 0.4 * (i % 2)   # oscillating mouth = talking
    still = lambda i: 0.30                  # constant (even if open) = listening

    # LEFT talks -> tight crop centered on left face (x~0.25), width 0 (tight).
    cx, _cy, w = reframe._window_target(_two_shot_window(talk, still))
    assert abs(cx - 0.25) < 0.1 and w == 0.0, "should crop tight to LEFT talker"

    # RIGHT talks -> tight crop on right face (x~0.75).
    cx, _cy, w = reframe._window_target(_two_shot_window(still, talk))
    assert abs(cx - 0.75) < 0.1 and w == 0.0, "should crop tight to RIGHT talker"


def test_active_speaker_keeps_both_when_ambiguous() -> None:
    """ASD: cross-talk or both-silent -> keep BOTH (two-shot widen), don't guess."""
    talk_a = lambda i: 0.1 + 0.4 * (i % 2)
    talk_b = lambda i: 0.1 + 0.4 * ((i + 1) % 2)
    # Both talking (cross-talk) -> widen (width > 0), center between them.
    cx, _cy, w = reframe._window_target(_two_shot_window(talk_a, talk_b))
    assert w > 0.0 and abs(cx - 0.5) < 0.1, "cross-talk should keep both"
    # Both still -> widen (no clear talker).
    _cx, _cy, w2 = reframe._window_target(
        _two_shot_window(lambda i: 0.30, lambda i: 0.32)
    )
    assert w2 > 0.0, "both-silent should keep both, not guess a talker"


def test_captions_ass_karaoke_ltr(job_id: str) -> None:
    _score(job_id, top=5)
    extract.extract_clips(job_id, top_n=5)
    reframe.reframe_clips(job_id, top_n=5)
    results = captions.caption_clips(job_id, top_n=5)
    assert len(results) == 5
    ass_text = Path(results[0].ass_path).read_text(encoding="utf-8")
    assert "{\\k" in ass_text          # karaoke tags
    assert "Style: Karaoke" in ass_text
    assert results[0].rtl is False     # fixture is English


def test_captions_rtl_arabic() -> None:
    words = [
        {"word": "مرحبا", "start": 0.0, "end": 0.5},
        {"word": "بكم", "start": 0.5, "end": 1.0},
    ]
    ass = captions.build_ass(words, clip_start=0.0, rtl=True, language="ar")
    assert captions._RLE in ass and captions._PDF in ass
    assert "مرحبا" in ass
    assert "{\\k" in ass


def test_captions_emoji_and_emphasis() -> None:
    words = [
        {"word": "money", "start": 0.0, "end": 0.4},
        {"word": "never", "start": 0.4, "end": 0.8},
    ]
    ass = captions.build_ass(words, clip_start=0.0, rtl=False, language="en")
    assert "💰" in ass               # emoji keyword
    assert "NEVER" in ass             # uppercase emphasis


def test_ass_timestamp_format() -> None:
    assert captions._ass_timestamp(0.0) == "0:00:00.00"
    assert captions._ass_timestamp(61.5) == "0:01:01.50"
    assert captions._ass_timestamp(3661.999) == "1:01:02.00"


def test_full_pipeline_five_rows(job_id: str) -> None:
    summary = run_mod.run_pipeline("mock://podcast", job_id, 5, force=True)
    assert summary["clip_count"] == 5
    assert len(summary["rows"]) == 5
    for row in summary["rows"]:
        assert row["final_exists"] is True
        assert Path(row["final_path"]).name.endswith("_final.mp4")


def test_pipeline_resumable(job_id: str) -> None:
    run_mod.run_pipeline("mock://podcast", job_id, 5, force=True)
    ws = config.get_settings().workspace(job_id)
    state = json.loads((ws / "run_state.json").read_text(encoding="utf-8"))
    assert state["completed"]["done"] is True
    # Second run should skip everything (no exception, same summary).
    summary = run_mod.run_pipeline("mock://podcast", job_id, 5, force=False)
    assert summary["clip_count"] == 5
