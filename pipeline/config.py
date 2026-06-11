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


def _resolve_mock_mode(raw: str, openai_api_key: str) -> bool:
    """Resolve the tri-state MOCK_MODE setting into a concrete bool.

    `auto` => mock when no OpenAI key is configured (the local-dev default).
    """
    raw = (raw or "auto").strip().lower()
    if raw in ("true", "1", "yes", "on"):
        return True
    if raw in ("false", "0", "no", "off"):
        return False
    # "auto" (or anything unexpected): mock unless a real OpenAI key is present.
    return openai_api_key == ""


class Settings(BaseModel):
    """Typed, immutable view of all pipeline configuration."""

    model_config = {"frozen": True}

    # ── Mode ────────────────────────────────────────────────────────────
    mock_mode: bool = Field(..., description="True => use deterministic mocks, no GPU/paid APIs")
    raw_mock_mode: MockModeSetting = Field(..., description="The unresolved MOCK_MODE env value")

    # ── Paths ───────────────────────────────────────────────────────────
    repo_root: Path = Field(..., description="Repository root directory")
    workspace_root: Path = Field(..., description="Root dir holding per-job artifact folders")

    # ── Scoring (OpenAI / GPT-4o-mini) ──────────────────────────────────
    openai_api_key: str = Field("", description="OpenAI key; empty => mock scoring")
    scoring_model: str = Field("gpt-4o-mini", description="LLM used for clip scoring")

    # ── Transcription (WhisperX + pyannote) ─────────────────────────────
    huggingface_token: str = Field("", description="HF token for pyannote diarization")
    whisperx_model: str = Field("large-v3", description="WhisperX model name")
    whisperx_device: str = Field("cuda", description="cuda | cpu (mock is a no-op)")

    # ── Storage (Cloudflare R2 / S3 API) ────────────────────────────────
    r2_account_id: str = Field("", description="Cloudflare R2 account id")
    r2_access_key_id: str = Field("", description="R2 access key id")
    r2_secret_access_key: str = Field("", description="R2 secret access key")
    r2_bucket: str = Field("focaldive-clips", description="R2 bucket name")
    r2_endpoint: str = Field("", description="R2 S3-compatible endpoint URL")

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
    raw_mock = (_env("MOCK_MODE", "auto") or "auto").lower()
    if raw_mock not in ("auto", "true", "false"):
        raw_mock = "auto"

    workspace_root = Path(_env("WORKSPACE_DIR") or str(REPO_ROOT / "workspace")).resolve()

    return Settings(
        mock_mode=_resolve_mock_mode(raw_mock, openai_api_key),
        raw_mock_mode=raw_mock,  # type: ignore[arg-type]
        repo_root=REPO_ROOT,
        workspace_root=workspace_root,
        openai_api_key=openai_api_key,
        scoring_model=_env("SCORING_MODEL", "gpt-4o-mini") or "gpt-4o-mini",
        huggingface_token=_env("HUGGINGFACE_TOKEN"),
        whisperx_model=_env("WHISPERX_MODEL", "large-v3") or "large-v3",
        whisperx_device=_env("WHISPERX_DEVICE", "cuda") or "cuda",
        r2_account_id=_env("R2_ACCOUNT_ID"),
        r2_access_key_id=_env("R2_ACCESS_KEY_ID"),
        r2_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        r2_bucket=_env("R2_BUCKET", "focaldive-clips") or "focaldive-clips",
        r2_endpoint=_env("R2_ENDPOINT"),
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
    print("FocalDive Clips — resolved configuration")
    print("=" * 48)
    print(f"  MOCK_MODE (raw)   : {s.raw_mock_mode}")
    print(f"  MOCK_MODE (resolved): {s.mock_mode}")
    print(f"  repo_root         : {s.repo_root}")
    print(f"  workspace_root    : {s.workspace_root}")
    print(f"  scoring_model     : {s.scoring_model}")
    print(f"  openai_api_key set: {bool(s.openai_api_key)}")
    print(f"  whisperx_model    : {s.whisperx_model}")
    print(f"  whisperx_device   : {s.whisperx_device}")
    print(f"  huggingface set   : {bool(s.huggingface_token)}")
    print(f"  r2_bucket         : {s.r2_bucket}")
    print(f"  r2_configured     : {s.r2_configured}")
    print(f"  redis_url         : {s.redis_url}")
    print(f"  database_url set  : {bool(s.database_url)}")
    print("-" * 48)
    sample = s.workspace("demo-job-0001")
    print(f"  example workspace : {sample}  (exists={sample.exists()})")
