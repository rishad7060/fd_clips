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
    # Dedupe keeps clips overlapping no more than the threshold of the shorter.
    for i, a in enumerate(cands):
        for b in cands[i + 1:]:
            assert score_clips._overlap_fraction(a, b) <= 0.6 + 1e-9


def _wordy_transcript():
    """A tiny transcript with word-level timing across 3 sentences."""
    def words(pairs):
        return [{"word": w, "start": s, "end": e} for (w, s, e) in pairs]
    return {
        "duration": 9.0, "language": "en",
        "segments": [
            {"start": 0.0, "end": 3.0, "speaker": "S0", "text": "Money is simple.",
             "words": words([("Money", 0.0, 0.5), ("is", 0.5, 0.8), ("simple.", 0.8, 1.4)])},
            {"start": 3.0, "end": 6.0, "speaker": "S0", "text": "And it grows fast.",
             "words": words([("And", 3.0, 3.3), ("it", 3.3, 3.5), ("grows", 3.5, 3.9), ("fast.", 3.9, 4.4)])},
            {"start": 6.0, "end": 9.0, "speaker": "S0", "text": "Start today now.",
             "words": words([("Start", 6.0, 6.4), ("today", 6.4, 6.9), ("now.", 6.9, 7.4)])},
        ],
    }


def test_reconstruct_sentences_word_timing() -> None:
    """Sentences rebuild from words with exact first/last-word timing."""
    sents = score_clips._reconstruct_sentences(_wordy_transcript())
    assert len(sents) == 3
    assert sents[0].text == "Money is simple." and sents[0].start == 0.0
    assert sents[2].text == "Start today now." and sents[2].end == 7.4


def test_orphan_start_detection_and_repair() -> None:
    """A clip starting on 'And it…' walks back to the clean prior sentence."""
    sents = score_clips._reconstruct_sentences(_wordy_transcript())
    assert score_clips._starts_on_orphan("And it grows fast.")
    assert not score_clips._starts_on_orphan("Money is simple.")
    # Starting at idx 1 ("And it…") repairs back to idx 0 ("Money is simple.").
    assert score_clips._repair_start_idx(sents, 1, 2) == 0


def test_indices_to_clip_resolves_real_times() -> None:
    """Index range resolves to real word-level start/end + joined text."""
    sents = score_clips._reconstruct_sentences(_wordy_transcript())
    start, end, text = score_clips._indices_to_clip(sents, 0, 2)
    assert start == 0.0 and end == 7.4
    assert text.startswith("Money is simple.") and text.endswith("Start today now.")


def test_sentence_spans_segments_without_punctuation() -> None:
    """A sentence split across WhisperX segments (no mid punctuation) stays ONE."""
    def words(pairs):
        return [{"word": w, "start": s, "end": e} for (w, s, e) in pairs]
    tr = {
        "duration": 5.0, "language": "en",
        "segments": [
            # No terminal punctuation, no pause to next segment -> one sentence.
            {"start": 0.0, "end": 1.5, "speaker": "S0", "text": "I think that",
             "words": words([("I", 0.0, 0.3), ("think", 0.3, 0.8), ("that", 0.8, 1.1)])},
            {"start": 1.5, "end": 3.0, "speaker": "S0", "text": "nobody talks about it.",
             "words": words([("nobody", 1.2, 1.6), ("talks", 1.6, 2.0),
                             ("about", 2.0, 2.3), ("it.", 2.3, 2.7)])},
        ],
    }
    sents = score_clips._reconstruct_sentences(tr)
    assert len(sents) == 1, f"should be one sentence across segments, got {[s.text for s in sents]}"
    assert sents[0].text == "I think that nobody talks about it."
    assert sents[0].start == 0.0 and sents[0].end == 2.7


def test_indices_to_clip_coerces_messy_types() -> None:
    """LLM-returned messy index types don't crash; un-coercible -> None."""
    sents = score_clips._reconstruct_sentences(_wordy_transcript())
    assert score_clips._indices_to_clip(sents, "0", "2.0") is not None  # str/strfloat
    assert score_clips._indices_to_clip(sents, 0.0, 2.0) is not None    # float
    assert score_clips._indices_to_clip(sents, None, 2) is None         # null
    assert score_clips._indices_to_clip(sents, "foo", 2) is None        # garbage


def test_repair_returns_original_when_no_clean_start() -> None:
    """If every reachable start is an orphan, keep the original (don't lengthen)."""
    def mk(txt, i):
        return score_clips._Sentence(i, txt, float(i), float(i) + 0.5)
    sents = [mk("And one.", 0), mk("But two.", 1), mk("So three.", 2), mk("It four.", 3)]
    # start at 3 ("It four."), all preceding are orphans within 2 steps -> keep 3.
    assert score_clips._repair_start_idx(sents, 3, 3) == 3


def test_resolve_index_candidates_repairs_orphan() -> None:
    """LLM start_idx on an orphan sentence is repaired to a clean start."""
    sents = score_clips._reconstruct_sentences(_wordy_transcript())
    cands = [{"start_idx": 1, "end_idx": 2, "virality_score": 80, "hook_line": "",
              "payoff_line": "", "hook_type": "story"}]
    out = score_clips._resolve_index_candidates(cands, sents)
    assert len(out) == 1
    assert out[0]["start"] == 0.0, "orphan 'And it' start repaired back to idx 0"
    assert "start_idx" not in out[0] and "end_idx" not in out[0]


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


# ── Clip-level speaker-switching (host asks -> cut to guest) ─────────────────

def _ab_samples(a_open, b_open, dur=6.0, n=60):
    """Two persistent face clusters: A at x=0.25, B at x=0.75, over [0,dur).

    ``a_open(t)``/``b_open(t)`` give each cluster's mouth openness at time t.
    """
    out = []
    for k in range(n):
        t = dur * k / n
        out.append(reframe.FaceSample(
            t=t, cx=0.25, cy=0.4, is_cut=False,
            faces=[(0.25, 0.4, a_open(t)), (0.75, 0.4, b_open(t))],
        ))
    return out


def _voiced_segments(dur=6.0):
    """A transcript segment fully voicing [0,dur) with words every 0.3s."""
    words = []
    t = 0.0
    while t < dur:
        words.append({"word": "w", "start": t, "end": t + 0.25})
        t += 0.3
    return [{"start": 0.0, "end": dur, "speaker": "SPEAKER_00", "words": words}]


def test_speaker_switch_clean_a_then_b() -> None:
    """A talks first half, B talks second half -> timeline cuts A->B; tight crops."""
    a_open = lambda t: 0.1 + 0.4 * (int(t / 0.2) % 2) if t < 3.0 else 0.30
    b_open = lambda t: 0.30 if t < 3.0 else 0.1 + 0.4 * (int(t / 0.2) % 2)
    samples = _ab_samples(a_open, b_open)

    clusters = reframe._detect_two_speaker_clusters(samples)
    assert clusters is not None, "two persistent clusters must be detected"
    word_starts, voiced = reframe._word_boundaries(_voiced_segments(), 0.0, 6.0)
    timeline = reframe._assign_speaker_timeline(
        samples, clusters[0], clusters[1], 6.0, word_starts, voiced
    )
    labels = [lbl for (_t, lbl) in timeline]
    assert labels[0] == "A" and "B" in labels, f"expect A then B, got {timeline}"
    assert reframe._timeline_has_switch(timeline)

    kfs = reframe._build_keyframes_ab(
        timeline, clusters[0], clusters[1], 6.0, 1920, 1080
    )
    xs = sorted({kf.x for kf in kfs})
    assert len(xs) == 2, f"two distinct crop x positions expected, got {xs}"
    base_w, _h, _ = reframe._center_crop_geometry(1920, 1080)
    assert all(kf.width == base_w for kf in kfs), "A/B crops must be tight base width"


def test_speaker_switch_crosstalk_does_not_engage() -> None:
    """Both clusters talk the whole time -> no clean switch -> A/B mode off."""
    a_open = lambda t: 0.1 + 0.4 * (int(t / 0.2) % 2)
    b_open = lambda t: 0.1 + 0.4 * ((int(t / 0.2) + 1) % 2)
    samples = _ab_samples(a_open, b_open)
    clusters = reframe._detect_two_speaker_clusters(samples)
    assert clusters is not None
    word_starts, voiced = reframe._word_boundaries(_voiced_segments(), 0.0, 6.0)
    timeline = reframe._assign_speaker_timeline(
        samples, clusters[0], clusters[1], 6.0, word_starts, voiced
    )
    assert not reframe._timeline_has_switch(timeline), "cross-talk must not switch"


def test_negative_evidence_no_pingpong() -> None:
    """When the active speaker is the UNMEASURABLE cluster, don't ping-pong.

    A talks (measurable) for ~2s, then B talks but B is in profile so its lips
    are never measured (openness -1). Speech is continuous. The crop should
    switch A->B ONCE (negative evidence) and then HOLD on B — never bounce back
    to A every min-hold just because B is unmeasurable.
    """
    # A measurable + moving only in the first 2s; B never measurable (op=-1).
    def a_open(t):
        return (0.1 + 0.4 * (int(t / 0.2) % 2)) if t < 2.0 else 0.30
    out = []
    n, dur = 80, 8.0
    for k in range(n):
        t = dur * k / n
        out.append(reframe.FaceSample(
            t=t, cx=0.25, cy=0.4, is_cut=False,
            faces=[(0.25, 0.4, a_open(t)), (0.75, 0.4, -1.0)],  # B unmeasurable
        ))
    clusters = reframe._detect_two_speaker_clusters(out)
    assert clusters is not None
    word_starts, voiced = reframe._word_boundaries(_voiced_segments(dur), 0.0, dur)
    timeline = reframe._assign_speaker_timeline(
        out, clusters[0], clusters[1], dur, word_starts, voiced
    )
    labels = [lbl for (_t, lbl) in timeline]
    # At most one A->B transition, and never a B->A bounce-back.
    transitions = sum(1 for i in range(1, len(labels)) if labels[i] != labels[i - 1])
    assert transitions <= 1, f"should not ping-pong, got {timeline}"
    assert labels[-1] == "B", f"should settle on B (the real talker), got {timeline}"


def test_single_cluster_no_speaker_switch() -> None:
    """One face cluster (single speaker) -> no two-speaker detection."""
    samples = [
        reframe.FaceSample(t=0.1 * k, cx=0.5, cy=0.4, is_cut=False,
                           faces=[(0.5, 0.4, 0.2)])
        for k in range(40)
    ]
    assert reframe._detect_two_speaker_clusters(samples) is None


def test_switch_snaps_to_word_boundary() -> None:
    """A committed switch time snaps to the nearest word start within +/-window."""
    # boundary at 3.20 within 0.4 of 3.07 -> snaps; none near 3.07 -> unchanged.
    assert reframe._snap_to_boundary(3.07, [1.2, 3.20, 5.0], 0.4) == 3.20
    assert reframe._snap_to_boundary(3.07, [1.2, 5.0], 0.4) == 3.07


def test_keyframe_expr_holds_until_next_keyframe() -> None:
    """Each keyframe's value must hold from its OWN time until the NEXT one's.

    Regression: the expr previously used each keyframe's own start as its
    threshold, shifting the whole crop animation one keyframe early (a clip
    showing speaker B during speaker A's segment).
    """
    kfs = [
        reframe.CropKeyframe(t=0.0, x=198, width=608),
        reframe.CropKeyframe(t=2.5, x=1144, width=608),
        reframe.CropKeyframe(t=3.9, x=198, width=608),
    ]
    expr = reframe._keyframes_to_ffmpeg_expr(kfs, "x")

    def ev(t: float) -> int:
        x = kfs[-1].x
        for i in range(len(kfs) - 2, -1, -1):
            if t < kfs[i + 1].t + 0.0001:
                x = kfs[i].x
        return x

    assert ev(0.0) == 198 and ev(1.0) == 198 and ev(2.4) == 198, "A holds 0..2.5"
    assert ev(2.6) == 1144 and ev(3.8) == 1144, "B holds 2.5..3.9"
    assert ev(4.0) == 198, "A again after 3.9"
    # The expression must reference the SECOND keyframe's time as the first cut.
    assert "2.5001" in expr


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
