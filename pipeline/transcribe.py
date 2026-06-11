"""Stage 2 — Transcription + diarization.

Produces ``workspace/{job_id}/transcript.json`` conforming to CONTRACTS.md §2:
top-level {job_id, language, duration, source, segments[]}, each segment with
{text, start, end, speaker, words[]} and per-word {word, start, end}.

Groq branch (MOCK_MODE=false, GROQ_API_KEY set — the v2 $0 MVP default):
    * Extract a compressed mono 16kHz mp3 audio track with ffmpeg (keeps long
      videos under Groq's ~25MB upload cap; audio, not video).
    * Send it to Groq's whisper-large-v3 with word + segment timestamps.
    * No diarization on the free MVP path — every segment is 'SPEAKER_00'.
      (PHASE 2: pyannote diarization for multi-speaker; see WhisperX branch below.)

Real branch (MOCK_MODE=false, GPU box):
    * Extract audio from source.mp4.
    * Run WhisperX large-v3 with word-level alignment.
    * Run pyannote diarization (HF token from .env) and assign speakers.
    * For sources > 30 min, process in 20-min chunks with 30s overlap and merge.

Mock branch (MOCK_MODE=true, offline):
    * Return the canonical fixture tests/fixtures/transcript.sample.json
      (re-stamped with the requested job_id), written to the workspace.

NOTE: WhisperX 3.3.4+ relocated ``DiarizationPipeline``. We import it defensively
so the real branch keeps working across versions. (TODO: pin a version once the
RunPod image is locked and drop the fallbacks.)

Standalone:
    python pipeline/transcribe.py                 # mock transcript for demo job
    python pipeline/transcribe.py --job-id X
"""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore


def _fixture_path() -> Path:
    settings = get_settings()
    return settings.repo_root / "tests" / "fixtures" / "transcript.sample.json"


def transcribe(job_id: str, source_path: Optional[Path] = None) -> dict[str, Any]:
    """Transcribe the job's source and return the transcript dict.

    Also writes ``workspace/{job_id}/transcript.json``.
    """
    settings = get_settings()
    ws = settings.workspace(job_id)

    backend = settings.resolved_transcribe_backend()
    if backend == "mock":
        transcript = _transcribe_mock(job_id)
    else:
        src = source_path or (ws / "source.mp4")
        if backend == "groq":
            transcript = _transcribe_groq(job_id, Path(src))
        elif backend == "faster-whisper":
            transcript = _transcribe_faster_whisper(job_id, Path(src))
        else:  # 'whisperx'
            transcript = _transcribe_real(job_id, Path(src))

    (ws / "transcript.json").write_text(
        json.dumps(transcript, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return transcript


def _transcribe_mock(job_id: str) -> dict[str, Any]:
    """Return the canned fixture transcript, re-stamped with this job_id."""
    data = json.loads(_fixture_path().read_text(encoding="utf-8"))
    data["job_id"] = job_id
    data["source"] = f"workspace/{job_id}/source.mp4"
    return data


def _load_diarization_pipeline(hf_token: str):
    """Import DiarizationPipeline defensively across WhisperX versions.

    WhisperX < 3.3.4 exposed ``whisperx.DiarizationPipeline``. 3.3.4+ moved it to
    ``whisperx.diarize.DiarizationPipeline``. As a last resort we fall back to
    pyannote's own ``Pipeline.from_pretrained``.
    """
    try:  # legacy location
        from whisperx import DiarizationPipeline  # type: ignore
        return DiarizationPipeline(use_auth_token=hf_token)
    except (ImportError, AttributeError):
        pass
    try:  # WhisperX 3.3.4+ location
        from whisperx.diarize import DiarizationPipeline  # type: ignore
        return DiarizationPipeline(use_auth_token=hf_token)
    except (ImportError, AttributeError):
        pass
    # Final fallback: raw pyannote pipeline.
    from pyannote.audio import Pipeline  # type: ignore
    return Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1", use_auth_token=hf_token
    )


def _transcribe_real(job_id: str, source_path: Path) -> dict[str, Any]:
    """Real WhisperX + alignment + pyannote diarization (GPU box only)."""
    import whisperx  # lazy import; never needed in MOCK_MODE

    settings = get_settings()
    device = settings.whisperx_device
    audio = whisperx.load_audio(str(source_path))

    # 1. Transcribe with large-v3.
    model = whisperx.load_model(settings.whisperx_model, device)
    result = model.transcribe(audio, batch_size=16)
    language = result["language"]

    # 2. Word-level alignment.
    align_model, metadata = whisperx.load_align_model(
        language_code=language, device=device
    )
    result = whisperx.align(
        result["segments"], align_model, metadata, audio, device,
        return_char_alignments=False,
    )

    # 3. Diarization (pyannote) and speaker assignment.
    diarize_pipeline = _load_diarization_pipeline(settings.huggingface_token)
    diarize_segments = diarize_pipeline(audio)
    result = whisperx.assign_word_speakers(diarize_segments, result)

    # 4. Normalize to the CONTRACTS.md shape.
    segments: list[dict[str, Any]] = []
    for seg in result["segments"]:
        words = [
            {
                "word": w.get("word", "").strip(),
                "start": float(w.get("start", seg["start"])),
                "end": float(w.get("end", seg["end"])),
            }
            for w in seg.get("words", [])
            if w.get("word")
        ]
        segments.append(
            {
                "text": seg.get("text", "").strip(),
                "start": float(seg["start"]),
                "end": float(seg["end"]),
                "speaker": seg.get("speaker", "SPEAKER_00"),
                "words": words,
            }
        )

    duration = segments[-1]["end"] if segments else 0.0
    return {
        "job_id": job_id,
        "language": language,
        "duration": duration,
        "source": str(source_path),
        "segments": segments,
    }


# Groq's audio API rejects uploads above ~25MB and wants audio, not video.
# A mono 16kHz mp3 is tiny (~1MB/min) and is exactly what whisper-large-v3
# consumes, so even hour-long talking-head videos stay comfortably under the cap.
_GROQ_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # ~25 MB Groq free/standard upload limit
_GROQ_RETRY_BACKOFFS = (2, 4, 8)  # seconds; 3 tries total on 429 / rate-limit errors


def _extract_audio_for_groq(source_path: Path, out_path: Path) -> Path:
    """Extract a compressed mono 16kHz mp3 audio track from ``source_path``.

    Groq's transcription endpoint wants an audio file under ~25MB. Down-mixing to
    mono 16kHz mp3 is the cheapest representation Whisper accepts and keeps long
    videos well under the cap (~1MB/min).
    """
    settings = get_settings()
    ffmpeg = settings.ffmpeg_path or "ffmpeg"
    cmd = [
        ffmpeg, "-y",
        "-i", str(source_path),
        "-vn",                 # drop video — audio only
        "-ac", "1",            # mono
        "-ar", "16000",        # 16kHz (Whisper's native rate)
        "-c:a", "libmp3lame",  # mp3; compact and universally accepted by Groq
        "-b:a", "64k",
        str(out_path),
    ]
    # check=True surfaces a CalledProcessError with the ffmpeg command on failure.
    subprocess.run(cmd, check=True)
    return out_path


def _transcribe_groq(job_id: str, source_path: Path) -> dict[str, Any]:
    """Transcribe via Groq's hosted whisper-large-v3 — the v2 $0 MVP default.

    No GPU and no self-hosting: extracts a compressed audio track, uploads it to
    Groq, and maps the verbose_json response to the CONTRACTS.md §2 transcript
    shape. Retries with exponential backoff on rate-limit (429) errors.

    PHASE 2: no diarization on the free MVP path, so every segment is labelled
    'SPEAKER_00'. Multi-speaker support (podcasts) is the Phase-2 upgrade — run
    pyannote speaker-diarization and assign speakers, exactly like the WhisperX
    branch (``_transcribe_real``) does. See fd_clips_v2.md Part 5
    ("Users ask for podcasts/2-speakers" → add active-speaker / diarization).
    """
    # Lazy import so the mock path stays dependency-free and the paid SDK is only
    # required on the real Groq branch.
    from groq import Groq  # type: ignore

    settings = get_settings()
    ws = settings.workspace(job_id)

    # 1. Extract a small audio file (video is rejected / too large otherwise).
    audio_path = _extract_audio_for_groq(source_path, ws / "audio.mp3")
    size = audio_path.stat().st_size
    if size > _GROQ_MAX_UPLOAD_BYTES:
        # PHASE 2: for very long sources, chunk the audio into <25MB segments,
        # transcribe each, and merge with time offsets (mirrors the WhisperX
        # 20-min-chunk strategy). MVP scope is short talking-head videos, so a
        # clear error is sufficient here.
        raise RuntimeError(
            f"audio.mp3 is {size / 1_048_576:.1f}MB, over Groq's "
            f"~{_GROQ_MAX_UPLOAD_BYTES // 1_048_576}MB limit — chunking is a "
            "Phase-2 upgrade (see fd_clips_v2.md Part 2)."
        )

    client = Groq(api_key=settings.groq_api_key)

    # 2. Call Groq with word + segment granularities, retrying on rate limits.
    #
    # PHASE 2: the production approach is to QUEUE jobs (BullMQ) so we never burst
    # past Groq's free daily quota — backoff only covers transient 429s within a
    # single job. See fd_clips_v2.md Part 2 caveat ("queue jobs to stay inside it").
    result: Any = None
    last_exc: Optional[BaseException] = None
    for attempt, backoff in enumerate((*_GROQ_RETRY_BACKOFFS, None)):
        try:
            with audio_path.open("rb") as fh:
                result = client.audio.transcriptions.create(
                    file=(audio_path.name, fh.read()),
                    model=settings.groq_model,
                    response_format="verbose_json",
                    timestamp_granularities=["word", "segment"],
                )
            break
        except Exception as exc:  # noqa: BLE001 — narrow to rate limits below
            if not _is_rate_limit_error(exc) or backoff is None:
                # Non-retryable, or we've exhausted the retry budget.
                if _is_rate_limit_error(exc):
                    raise RuntimeError(
                        "Groq rate limit hit and retries exhausted "
                        f"({len(_GROQ_RETRY_BACKOFFS) + 1} attempts). Free daily "
                        "quota may be spent — queue jobs (fd_clips_v2.md Part 2)."
                    ) from exc
                raise
            last_exc = exc
            time.sleep(backoff)
    if result is None:  # pragma: no cover — defensive
        raise RuntimeError("Groq transcription failed") from last_exc

    return _map_groq_response(job_id, result, source_path)


def _is_rate_limit_error(exc: BaseException) -> bool:
    """True if ``exc`` looks like a Groq/HTTP 429 rate-limit error.

    Avoids importing groq's exception types at module scope (lazy dep): matches on
    class name and any ``status_code``/``code`` attribute equal to 429.
    """
    if exc.__class__.__name__ in ("RateLimitError", "TooManyRequests"):
        return True
    for attr in ("status_code", "code", "status"):
        if getattr(exc, attr, None) == 429:
            return True
    return "429" in str(exc) or "rate limit" in str(exc).lower()


def _as_dict(obj: Any) -> dict[str, Any]:
    """Coerce a Groq SDK response object (pydantic-like) into a plain dict."""
    if isinstance(obj, dict):
        return obj
    for meth in ("model_dump", "to_dict", "dict"):
        fn = getattr(obj, meth, None)
        if callable(fn):
            try:
                return fn()  # type: ignore[no-any-return]
            except Exception:  # noqa: BLE001
                pass
    return {k: getattr(obj, k) for k in dir(obj) if not k.startswith("_")}


def _map_groq_response(
    job_id: str, result: Any, source_path: Path
) -> dict[str, Any]:
    """Map Groq's verbose_json transcription to the CONTRACTS.md §2 shape.

    Groq returns a flat ``words`` list and a ``segments`` list (each with its own
    start/end and text). We attach each word to the segment whose [start, end]
    window contains the word's midpoint, so per-segment karaoke timing is exact.
    """
    data = _as_dict(result)
    language = (data.get("language") or "en")
    # ISO 639-1 where possible; Groq sometimes returns a language name ("english").
    language = _LANG_NAME_TO_CODE.get(language.lower(), language)

    raw_words: list[dict[str, Any]] = [
        {
            "word": (w.get("word") or "").strip(),
            "start": float(w.get("start", 0.0)),
            "end": float(w.get("end", 0.0)),
        }
        for w in (data.get("words") or [])
        if (w.get("word") or "").strip()
    ]

    segments: list[dict[str, Any]] = []
    raw_segments = data.get("segments") or []
    wi = 0  # pointer into raw_words (both lists are time-ordered)
    for seg in raw_segments:
        s_start = float(seg.get("start", 0.0))
        s_end = float(seg.get("end", s_start))
        seg_words: list[dict[str, Any]] = []
        # Consume words whose midpoint falls within this segment's window.
        while wi < len(raw_words):
            w = raw_words[wi]
            mid = (w["start"] + w["end"]) / 2.0
            if mid < s_start:
                wi += 1  # stray word before this segment; skip it
                continue
            if mid > s_end:
                break  # belongs to a later segment
            seg_words.append(w)
            wi += 1
        segments.append(
            {
                "text": (seg.get("text") or "").strip(),
                "start": s_start,
                "end": s_end,
                # No diarization on the free MVP path (see PHASE 2 note above).
                "speaker": "SPEAKER_00",
                "words": seg_words,
            }
        )

    # Prefer Groq's reported duration; fall back to last word/segment end.
    duration = float(data.get("duration") or 0.0)
    if not duration:
        if segments:
            duration = segments[-1]["end"]
        elif raw_words:
            duration = raw_words[-1]["end"]

    return {
        "job_id": job_id,
        "language": language,
        "duration": duration,
        "source": str(source_path),
        "segments": segments,
    }


# Minimal map for Groq returning full language names instead of ISO 639-1 codes.
_LANG_NAME_TO_CODE: dict[str, str] = {
    "english": "en", "arabic": "ar", "tamil": "ta", "hindi": "hi",
    "urdu": "ur", "spanish": "es", "french": "fr", "german": "de",
}


def _transcribe_faster_whisper(job_id: str, source_path: Path) -> dict[str, Any]:
    """Free CPU transcription via faster-whisper.

    No GPU and no paid API: loads ``settings.faster_whisper_model`` on CPU with
    int8 quantization and transcribes with word-level timestamps. Accepts either
    an audio or video file (faster-whisper decodes via ffmpeg/PyAV). No
    diarization on the free path, so every segment gets ``SPEAKER_00``.

    Maps to the CONTRACTS.md §2 transcript shape.
    """
    from faster_whisper import WhisperModel  # lazy; never needed in MOCK_MODE

    settings = get_settings()
    model = WhisperModel(
        settings.faster_whisper_model, device="cpu", compute_type="int8"
    )
    segment_iter, info = model.transcribe(
        str(source_path), word_timestamps=True
    )

    language = info.language or "en"
    segments: list[dict[str, Any]] = []
    for seg in segment_iter:
        words: list[dict[str, Any]] = []
        for w in seg.words or []:
            token = (w.word or "").strip()
            if not token:
                continue
            words.append(
                {
                    "word": token,
                    "start": float(w.start if w.start is not None else seg.start),
                    "end": float(w.end if w.end is not None else seg.end),
                }
            )
        segments.append(
            {
                "text": (seg.text or "").strip(),
                "start": float(seg.start),
                "end": float(seg.end),
                "speaker": "SPEAKER_00",
                "words": words,
            }
        )

    # info.duration is the decoded source length; fall back to last segment end.
    duration = float(getattr(info, "duration", 0.0) or 0.0)
    if not duration and segments:
        duration = segments[-1]["end"]

    return {
        "job_id": job_id,
        "language": language,
        "duration": duration,
        "source": str(source_path),
        "segments": segments,
    }


def _main() -> None:
    parser = argparse.ArgumentParser(description="FocalDive transcribe stage")
    parser.add_argument("--job-id", default="demo-job-0001")
    args = parser.parse_args()

    t = transcribe(args.job_id)
    print(
        f"Transcribed job {t['job_id']}: language={t['language']} "
        f"duration={t['duration']}s segments={len(t['segments'])}"
    )
    print("First 3 segments:")
    for seg in t["segments"][:3]:
        print(
            f"  [{seg['start']:6.2f}-{seg['end']:6.2f}] {seg['speaker']}: "
            f"{seg['text'][:60]}  ({len(seg['words'])} words)"
        )


if __name__ == "__main__":
    _main()
