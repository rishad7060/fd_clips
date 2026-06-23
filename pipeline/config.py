"""Central configuration for the FocalDive Clips pipeline.

Loads `.env` via python-dotenv and exposes a single typed `Settings` object plus
a few convenience helpers. The most important value is `MOCK_MODE`:

    MOCK_MODE = auto  -> True when OPENAI_API_KEY is missing (local dev default)
    MOCK_MODE = true  -> always mock (no GPU / no paid APIs)
    MOCK_MODE = false -> use real WhisperX / pyannote / LR-ASD / nvenc / OpenAI

The interface is identical in mock and real mode so the real implementations drop
straight in on a RunPod GPU box once keys are present.

Run standalone to print the resolved settings:

    python pipeline/config.py
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load .env from the repo root (one level above this file's `pipeline/` dir).
# `override=False` so real process env wins over the committed .env.example.
REPO_ROOT: Path = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env", override=False)

MockModeSetting = Literal["auto", "true", "false"]


def _env(name: str, default: str = "") -> str:
    """Read an env var, treating empty/whitespace strings as unset."""
    value = os.environ.get(name, default)
    return value.strip() if value is not None else default


def _resolve_mock_mode(
    raw: str,
    openai_api_key: str,
    gemini_api_key: str = "",
    scoring_provider: str = "auto",
    transcribe_backend: str = "auto",
    groq_api_key: str = "",
) -> bool:
    """Resolve the tri-state MOCK_MODE setting into a concrete bool.

    `auto` => real (not mocked) as soon as ANY real capability is configured:
    a scoring key (Gemini or OpenAI), or an explicit non-mock backend choice.
    Otherwise mock - the keyless local-dev default. `true`/`false` are explicit.
    """
    raw = (raw or "auto").strip().lower()
    if raw in ("true", "1", "yes", "on"):
        return True
    if raw in ("false", "0", "no", "off"):
        return False
    # "auto": leave mock unless something real is configured.
    has_scoring_key = bool(openai_api_key or gemini_api_key)
    has_transcribe_key = bool(groq_api_key)
    explicit_backend = transcribe_backend.lower() in ("groq", "whisperx", "faster-whisper")
    explicit_provider = scoring_provider.lower() in ("gemini", "openai")
    real_configured = (
        has_scoring_key or has_transcribe_key or explicit_backend or explicit_provider
    )
    return not real_configured


class Settings(BaseModel):
    """Typed, immutable view of all pipeline configuration."""

    model_config = {"frozen": True}

    # ── Mode ────────────────────────────────────────────────────────────
    mock_mode: bool = Field(..., description="True => use deterministic mocks, no GPU/paid APIs")
    raw_mock_mode: MockModeSetting = Field(..., description="The unresolved MOCK_MODE env value")

    # ── Paths ───────────────────────────────────────────────────────────
    repo_root: Path = Field(..., description="Repository root directory")
    workspace_root: Path = Field(..., description="Root dir holding per-job artifact folders")

    # ── Scoring (LLM brain - OpenAI or Gemini) ──────────────────────────
    openai_api_key: str = Field("", description="OpenAI key; empty => no OpenAI scoring")
    scoring_model: str = Field("gpt-4o-mini", description="OpenAI model for clip scoring")
    gemini_api_key: str = Field("", description="Google AI Studio (Gemini) key; free tier")
    gemini_model: str = Field("gemini-2.0-flash", description="Gemini model for clip scoring")
    scoring_provider: str = Field(
        "auto",
        description="auto | gemini | openai | mock. 'auto' => gemini if its key is set, "
        "else openai if its key is set, else mock heuristic.",
    )

    # ── Transcription ───────────────────────────────────────────────────
    # MVP (v2): Groq's free Whisper API - no GPU, fast. Falls back to
    # faster-whisper (CPU) or WhisperX (GPU) when configured.
    groq_api_key: str = Field("", description="Groq API key (free tier); the MVP transcription path")
    groq_model: str = Field(
        "whisper-large-v3", description="Groq Whisper model (whisper-large-v3 | whisper-large-v3-turbo)"
    )
    huggingface_token: str = Field("", description="HF token for pyannote diarization (GPU path)")
    whisperx_model: str = Field("large-v3", description="WhisperX model name (GPU path)")
    whisperx_device: str = Field("cuda", description="cuda | cpu")
    transcribe_backend: str = Field(
        "auto",
        description="auto | groq | whisperx | faster-whisper | mock. 'auto' => groq when "
        "GROQ_API_KEY is set (MVP default); else whisperx on a CUDA box; else faster-whisper.",
    )
    faster_whisper_model: str = Field(
        "small", description="faster-whisper model (tiny|base|small|medium) - CPU, free"
    )

    # ── Tooling ──────────────────────────────────────────────────────────
    ffmpeg_path: str = Field("ffmpeg", description="ffmpeg binary (name on PATH or full path)")
    ffprobe_path: str = Field("ffprobe", description="ffprobe binary (name on PATH or full path)")

    # ── Storage (Cloudflare R2 / S3 API) ────────────────────────────────
    r2_account_id: str = Field("", description="Cloudflare R2 account id")
    r2_access_key_id: str = Field("", description="R2 access key id")
    r2_secret_access_key: str = Field("", description="R2 secret access key")
    r2_bucket: str = Field("focaldive-clips", description="R2 bucket name")
    r2_endpoint: str = Field("", description="R2 S3-compatible endpoint URL")

    # ── Email delivery (Resend - MVP clip delivery) ─────────────────────
    resend_api_key: str = Field("", description="Resend API key (free 3k/mo); empty => log instead of send")
    email_from: str = Field(
        "FocalDive Clips <clips@focaldive.com>", description="From address for delivery emails"
    )

    # ── Queue / DB (shared with API + worker) ───────────────────────────
    database_url: str = Field("", description="Postgres connection URL")
    redis_url: str = Field("redis://localhost:6379", description="Redis/BullMQ connection URL")

    # ── Convenience helpers ─────────────────────────────────────────────
    def workspace(self, job_id: str) -> Path:
        """Return (and create) the artifact directory for a given job."""
        if not job_id or any(c in job_id for c in ("/", "\\", "..")):
            raise ValueError(f"Invalid job_id for workspace path: {job_id!r}")
        path = self.workspace_root / job_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def resolved_scoring_provider(self) -> str:
        """Resolve the scoring provider: 'gemini' | 'openai' | 'mock'.

        Explicit SCORING_PROVIDER wins. 'auto' prefers Gemini (free tier) when its
        key is set, then OpenAI, else the deterministic mock heuristic. mock_mode
        forces 'mock' regardless, so a fully-mocked run never calls a paid API.
        """
        if self.mock_mode:
            return "mock"
        choice = (self.scoring_provider or "auto").lower()
        if choice == "gemini":
            return "gemini" if self.gemini_api_key else "mock"
        if choice == "openai":
            return "openai" if self.openai_api_key else "mock"
        if choice == "mock":
            return "mock"
        # auto
        if self.gemini_api_key:
            return "gemini"
        if self.openai_api_key:
            return "openai"
        return "mock"

    def resolved_transcribe_backend(self) -> str:
        """Resolve transcription backend: 'groq' | 'whisperx' | 'faster-whisper' | 'mock'.

        Explicit TRANSCRIBE_BACKEND wins (a 'groq' choice falls back to mock when
        no key is set). 'auto' prefers Groq's free API (the MVP default) when a key
        is present - no GPU, fast - then whisperx on a CUDA box, else faster-whisper
        (CPU, slow). mock_mode forces 'mock'.
        """
        if self.mock_mode:
            return "mock"
        choice = (self.transcribe_backend or "auto").lower()
        if choice == "groq":
            return "groq" if self.groq_api_key else "mock"
        if choice in ("whisperx", "faster-whisper", "mock"):
            return choice
        # auto: Groq API (free, no GPU) first - this is the MVP path.
        if self.groq_api_key:
            return "groq"
        return "whisperx" if self.whisperx_device == "cuda" else "faster-whisper"

    @property
    def r2_configured(self) -> bool:
        """True when all R2 credentials needed for uploads are present."""
        return bool(
            self.r2_account_id
            and self.r2_access_key_id
            and self.r2_secret_access_key
            and self.r2_bucket
            and self.r2_endpoint
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Build the singleton Settings object from the current environment."""
    openai_api_key = _env("OPENAI_API_KEY")
    gemini_api_key = _env("GEMINI_API_KEY")
    scoring_provider = (_env("SCORING_PROVIDER", "auto") or "auto").lower()
    transcribe_backend = (_env("TRANSCRIBE_BACKEND", "auto") or "auto").lower()
    groq_api_key = _env("GROQ_API_KEY")
    raw_mock = (_env("MOCK_MODE", "auto") or "auto").lower()
    if raw_mock not in ("auto", "true", "false"):
        raw_mock = "auto"

    workspace_root = Path(_env("WORKSPACE_DIR") or str(REPO_ROOT / "workspace")).resolve()

    return Settings(
        mock_mode=_resolve_mock_mode(
            raw_mock, openai_api_key, gemini_api_key, scoring_provider,
            transcribe_backend, groq_api_key,
        ),
        raw_mock_mode=raw_mock,  # type: ignore[arg-type]
        repo_root=REPO_ROOT,
        workspace_root=workspace_root,
        openai_api_key=openai_api_key,
        scoring_model=_env("SCORING_MODEL", "gpt-4o-mini") or "gpt-4o-mini",
        gemini_api_key=_env("GEMINI_API_KEY"),
        gemini_model=_env("GEMINI_MODEL", "gemini-2.0-flash") or "gemini-2.0-flash",
        scoring_provider=(_env("SCORING_PROVIDER", "auto") or "auto").lower(),
        groq_api_key=groq_api_key,
        groq_model=_env("GROQ_MODEL", "whisper-large-v3") or "whisper-large-v3",
        huggingface_token=_env("HUGGINGFACE_TOKEN"),
        whisperx_model=_env("WHISPERX_MODEL", "large-v3") or "large-v3",
        whisperx_device=_env("WHISPERX_DEVICE", "cuda") or "cuda",
        transcribe_backend=(_env("TRANSCRIBE_BACKEND", "auto") or "auto").lower(),
        faster_whisper_model=_env("FASTER_WHISPER_MODEL", "small") or "small",
        ffmpeg_path=_env("FFMPEG_PATH", "ffmpeg") or "ffmpeg",
        ffprobe_path=_env("FFPROBE_PATH", "ffprobe") or "ffprobe",
        r2_account_id=_env("R2_ACCOUNT_ID"),
        r2_access_key_id=_env("R2_ACCESS_KEY_ID"),
        r2_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        r2_bucket=_env("R2_BUCKET", "focaldive-clips") or "focaldive-clips",
        r2_endpoint=_env("R2_ENDPOINT"),
        resend_api_key=_env("RESEND_API_KEY"),
        email_from=_env("EMAIL_FROM", "FocalDive Clips <clips@focaldive.com>")
        or "FocalDive Clips <clips@focaldive.com>",
        database_url=_env("DATABASE_URL"),
        redis_url=_env("REDIS_URL", "redis://localhost:6379") or "redis://localhost:6379",
    )


# Module-level singletons for ergonomic imports: `from pipeline.config import settings, MOCK_MODE`
settings: Settings = get_settings()
MOCK_MODE: bool = settings.mock_mode
WORKSPACE_ROOT: Path = settings.workspace_root


def workspace(job_id: str) -> Path:
    """Convenience wrapper around `settings.workspace(job_id)`."""
    return settings.workspace(job_id)


if __name__ == "__main__":
    s = get_settings()
    print("FocalDive Clips - resolved configuration")
    print("=" * 48)
    print(f"  MOCK_MODE (raw)   : {s.raw_mock_mode}")
    print(f"  MOCK_MODE (resolved): {s.mock_mode}")
    print(f"  repo_root         : {s.repo_root}")
    print(f"  workspace_root    : {s.workspace_root}")
    print(f"  scoring_provider  : {s.scoring_provider} -> resolved={s.resolved_scoring_provider()}")
    print(f"  openai_api_key set: {bool(s.openai_api_key)}  (model {s.scoring_model})")
    print(f"  gemini_api_key set: {bool(s.gemini_api_key)}  (model {s.gemini_model})")
    print(f"  transcribe_backend: {s.transcribe_backend} -> resolved={s.resolved_transcribe_backend()}")
    print(f"  faster_whisper    : {s.faster_whisper_model}")
    print(f"  whisperx_model    : {s.whisperx_model}  device={s.whisperx_device}")
    print(f"  huggingface set   : {bool(s.huggingface_token)}")
    print(f"  ffmpeg_path       : {s.ffmpeg_path}")
    print(f"  r2_bucket         : {s.r2_bucket}")
    print(f"  r2_configured     : {s.r2_configured}")
    print(f"  redis_url         : {s.redis_url}")
    print(f"  database_url set  : {bool(s.database_url)}")
    print("-" * 48)
    sample = s.workspace("demo-job-0001")
    print(f"  example workspace : {sample}  (exists={sample.exists()})")
