"""Stage 2 - Transcription + diarization.

Produces ``workspace/{job_id}/transcript.json`` conforming to CONTRACTS.md §2:
top-level {job_id, language, duration, source, segments[]}, each segment with
{text, start, end, speaker, words[]} and per-word {word, start, end}.

Groq branch (MOCK_MODE=false, GROQ_API_KEY set - the v2 $0 MVP default):
    * Extract a compressed mono 16kHz mp3 audio track with ffmpeg (keeps long
      videos under Groq's ~25MB upload cap; audio, not video).
    * Send it to Groq's whisper-large-v3 with word + segment timestamps.
    * No diarization on the free MVP path - every segment is 'SPEAKER_00'.
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
import math
import subprocess
import time
from pathlib import Path
from typing import Any, Optional

try:
    from .config import get_settings
    from .ingest import _resolve_tool
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore
    from ingest import _resolve_tool  # type: ignore


def _ffmpeg_bin() -> str:
    """Resolve a runnable ffmpeg binary the same way ingest/extract do.

    settings.ffmpeg_path may be a FULL path or a bare name on PATH, or empty. The
    old code used ``settings.ffmpeg_path or 'ffmpeg'`` directly, which crashed
    with WinError 2 whenever FFMPEG_PATH was unset and ffmpeg wasn't literally on
    the child process's PATH. _resolve_tool handles both cases; fall back to the
    bare name so the CalledProcessError message stays informative if truly absent.
    """
    return _resolve_tool(get_settings().ffmpeg_path, "ffmpeg") or "ffmpeg"


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


# Groq's audio API rejects large uploads. Its free tier is the tightest and has
# been seen to 413 ("request_too_large") on files well under a nominal 25MB (the
# multipart request overhead + a lower real cap), so we chunk conservatively: any
# audio over ~18MB OR longer than ~15 min is split into time-based chunks,
# transcribed separately, and merged with time offsets. A mono 16kHz 64kbps mp3
# is ~0.5MB/min, so an 18MB threshold is ~35 min - we also cap by DURATION so a
# long low-bitrate file still chunks.
_GROQ_MAX_UPLOAD_BYTES = 18 * 1024 * 1024  # conservative Groq upload ceiling
_GROQ_CHUNK_SECONDS = 600                  # 10-min chunks (comfortably small)
_GROQ_CHUNK_OVER_SECONDS = 15 * 60         # chunk anything longer than 15 min
_GROQ_RETRY_BACKOFFS = (2, 4, 8)  # seconds; 3 tries total on 429 / rate-limit errors


def _extract_audio_for_groq(source_path: Path, out_path: Path) -> Path:
    """Extract a compressed mono 16kHz mp3 audio track from ``source_path``.

    Groq's transcription endpoint wants an audio file under ~25MB. Down-mixing to
    mono 16kHz mp3 is the cheapest representation Whisper accepts and keeps long
    videos well under the cap (~1MB/min).
    """
    ffmpeg = _ffmpeg_bin()
    cmd = [
        ffmpeg, "-y",
        "-i", str(source_path),
        "-vn",                 # drop video - audio only
        "-ac", "1",            # mono
        "-ar", "16000",        # 16kHz (Whisper's native rate)
        "-c:a", "libmp3lame",  # mp3; compact and universally accepted by Groq
        "-b:a", "64k",
        str(out_path),
    ]
    # check=True surfaces a CalledProcessError with the ffmpeg command on failure.
    subprocess.run(cmd, check=True)
    return out_path


def _probe_audio_duration(audio_path: Path) -> float:
    """Duration (seconds) of an audio file via ffprobe; 0.0 if it can't be read."""
    try:
        settings = get_settings()
        ffprobe = _resolve_tool(settings.ffprobe_path, "ffprobe") or "ffprobe"
        out = subprocess.check_output(
            [ffprobe, "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
            text=True,
        )
        return float(out.strip())
    except (subprocess.CalledProcessError, ValueError, OSError):
        return 0.0


def _extract_audio_chunk(
    source_path: Path, out_path: Path, start: float, dur: float
) -> Path:
    """Extract a mono 16kHz 64kbps mp3 slice [start, start+dur] for Groq."""
    ffmpeg = _ffmpeg_bin()
    cmd = [
        ffmpeg, "-y", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}",
        "-i", str(source_path),
        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k",
        str(out_path),
    ]
    subprocess.run(cmd, check=True)
    return out_path


def _groq_transcribe_file(client: Any, audio_path: Path, model: str) -> Any:
    """POST one audio file to Groq (verbose_json, word+segment ts), retrying on
    429 rate limits with backoff. Raises on non-retryable errors / exhaustion."""
    for _attempt, backoff in enumerate((*_GROQ_RETRY_BACKOFFS, None)):
        try:
            with audio_path.open("rb") as fh:
                return client.audio.transcriptions.create(
                    file=(audio_path.name, fh.read()),
                    model=model,
                    response_format="verbose_json",
                    timestamp_granularities=["word", "segment"],
                )
        except Exception as exc:  # noqa: BLE001 - narrow to rate limits
            if not _is_rate_limit_error(exc) or backoff is None:
                if _is_rate_limit_error(exc):
                    raise RuntimeError(
                        "Groq rate limit hit and retries exhausted "
                        f"({len(_GROQ_RETRY_BACKOFFS) + 1} attempts). Free daily "
                        "quota may be spent - queue jobs (fd_clips_v2.md Part 2)."
                    ) from exc
                raise
            time.sleep(backoff)
    return None  # pragma: no cover - defensive


def _transcribe_groq_chunked(
    job_id: str,
    source_path: Path,
    audio_path: Path,
    duration: float,
    client: Any,
    settings: Any,
) -> dict[str, Any]:
    """Transcribe a long source by splitting the audio into fixed-length chunks,
    transcribing each, and merging segments/words with per-chunk time offsets.

    Each chunk's Groq response has chunk-relative timestamps; we add the chunk's
    absolute start time so the merged transcript is on the ORIGINAL timeline
    (score/extract/reframe all depend on absolute times).
    """
    ws = settings.workspace(job_id)
    chunk_len = float(_GROQ_CHUNK_SECONDS)
    n_chunks = max(1, math.ceil(duration / chunk_len))
    merged_words: list[dict[str, Any]] = []
    merged_segments: list[dict[str, Any]] = []
    language = "en"

    for i in range(n_chunks):
        start = i * chunk_len
        dur = min(chunk_len, duration - start)
        if dur <= 0.1:
            break
        chunk_path = ws / f"audio_chunk_{i:03d}.mp3"
        _extract_audio_chunk(source_path, chunk_path, start, dur)
        print(f"  [transcribe] chunk {i + 1}/{n_chunks} ({start / 60:.1f}-{(start + dur) / 60:.1f}min)…")
        result = _groq_transcribe_file(client, chunk_path, settings.groq_model)
        # Map to our shape (chunk-relative), then OFFSET onto the absolute timeline.
        part = _map_groq_response(job_id, result, source_path)
        language = part.get("language") or language
        for seg in part.get("segments", []):
            seg["start"] = float(seg.get("start", 0.0)) + start
            seg["end"] = float(seg.get("end", 0.0)) + start
            for w in seg.get("words", []):
                w["start"] = float(w.get("start", 0.0)) + start
                w["end"] = float(w.get("end", 0.0)) + start
            merged_segments.append(seg)
        # Clean up the chunk file to save disk on long videos.
        try:
            chunk_path.unlink()
        except OSError:
            pass

    # Rebuild the flat word list from the (offset) segment words for consistency.
    for seg in merged_segments:
        merged_words.extend(seg.get("words", []))

    return {
        "job_id": job_id,
        "language": language,
        "duration": duration,
        "source": str(source_path),
        "segments": merged_segments,
        "words": merged_words,
    }


def _transcribe_groq(job_id: str, source_path: Path) -> dict[str, Any]:
    """Transcribe via Groq's hosted whisper-large-v3 - the v2 $0 MVP default.

    No GPU and no self-hosting: extracts a compressed audio track, uploads it to
    Groq, and maps the verbose_json response to the CONTRACTS.md §2 transcript
    shape. Retries with exponential backoff on rate-limit (429) errors.

    PHASE 2: no diarization on the free MVP path, so every segment is labelled
    'SPEAKER_00'. Multi-speaker support (podcasts) is the Phase-2 upgrade - run
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
    duration = _probe_audio_duration(audio_path)

    # Pin the Groq SDK base URL explicitly. The SDK otherwise READS GROQ_BASE_URL
    # from the env - and if that's set to ".../openai/v1" (for the OpenAI-compatible
    # SCORING client) the SDK doubles it to ".../openai/v1/openai/v1/..." → 404.
    # The transcription API lives under the SDK's own default path from the root.
    client = Groq(api_key=settings.groq_api_key, base_url="https://api.groq.com")

    # 1b. Long / large audio: CHUNK it. Groq's endpoint 413s on big uploads (a
    # 26-min mp3 is enough), so split into ~10-min pieces, transcribe each, and
    # merge with time offsets. Short files take the single-shot path below.
    if size > _GROQ_MAX_UPLOAD_BYTES or duration > _GROQ_CHUNK_OVER_SECONDS:
        print(
            f"  [transcribe] audio is {size / 1_048_576:.1f}MB / {duration / 60:.1f}min "
            f"- chunking into {_GROQ_CHUNK_SECONDS // 60}-min pieces for Groq."
        )
        return _transcribe_groq_chunked(job_id, source_path, audio_path, duration, client, settings)

    # 2. Single-shot transcription (short file). Retries on rate limits inside.
    result = _groq_transcribe_file(client, audio_path, settings.groq_model)
    if result is None:  # pragma: no cover - defensive
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
