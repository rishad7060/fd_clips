"""Stage 2 — Transcription + diarization.

Produces ``workspace/{job_id}/transcript.json`` conforming to CONTRACTS.md §2:
top-level {job_id, language, duration, source, segments[]}, each segment with
{text, start, end, speaker, words[]} and per-word {word, start, end}.

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
        if backend == "faster-whisper":
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
