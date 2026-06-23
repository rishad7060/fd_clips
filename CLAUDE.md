# FocalDive Clips - Project Guide (CLAUDE.md)

## Goal
An AI pipeline + SaaS that takes a long video (YouTube URL or file) and outputs
5–10 ranked, captioned, vertical 9:16 short clips - like Opus Clip.

## Repository layout
```
focaldive-clips/
├── CLAUDE.md                 # this file - read first every session
├── requirements.txt          # Python deps for the pipeline
├── .env.example              # all required env vars (no secrets committed)
├── .gitignore
├── pipeline/                 # Python AI pipeline - each module runnable standalone & chainable
│   ├── config.py             # loads .env, central settings
│   ├── ingest.py             # yt-dlp + ffprobe → normalized source.mp4 + metadata
│   ├── transcribe.py         # WhisperX large-v3 + pyannote → transcript.json
│   ├── score_clips.py        # LLM scoring against prompts/virality_rubric.txt → candidates
│   ├── extract.py            # FFmpeg cut clips
│   ├── reframe.py            # PySceneDetect + face/ASD → 1080x1920 vertical
│   ├── captions.py           # per-word .ass karaoke captions (RTL-capable) burned in
│   ├── run.py                # orchestrate all stages, resumable, summary table
│   └── prompts/
│       └── virality_rubric.txt
├── app/
│   ├── api/                  # NestJS + Prisma(Postgres) + BullMQ + Clerk + Stripe
│   └── web/                  # Next.js 14 + Tailwind + Clerk
├── worker/                   # Dockerized GPU worker that consumes Redis/BullMQ jobs
└── tests/                    # cross-cutting tests + fixtures
```

## Stack rules (NON-NEGOTIABLE)
- Python 3.10+ (dev box has 3.12).
- Transcription: **WhisperX** (never vanilla Whisper).
- Diarization: **pyannote** (HF token from .env).
- Active-speaker detection: **LR-ASD** (never Haar cascades).
- Encoding: **FFmpeg with h264_nvenc** on GPU (never libx264 for final renders).
- Captions: **ASS via libass**, karaoke `\k` word highlight, MUST support RTL (Arabic/Urdu).
- Scoring LLM: GPT-4o-mini (rubric lives in `pipeline/prompts/virality_rubric.txt`, editable without touching code).
- Ingestion: **yt-dlp**.

## Conventions
- Type hints on all Python functions.
- Every pipeline module has a `if __name__ == "__main__":` test entry.
- Config in `.env` (see `.env.example`); never hardcode secrets or paths.
- Workspace artifacts go in `workspace/{job_id}/`.

## Local-dev reality (this machine: Windows, no GPU, no API keys)
GPU/paid paths are **mocked** so everything runs and is testable locally:
- `pipeline/config.py` exposes `MOCK_MODE` (default true when keys absent).
- In MOCK_MODE: transcribe returns a canned transcript fixture, score uses a deterministic
  heuristic instead of the LLM, reframe/captions use libx264 fallback if nvenc unavailable.
- The NestJS API and Next.js web app run fully locally against a mocked worker.
- Swap mocks for real implementations on a RunPod 4090 pod with keys - interfaces are identical.

## Build workflow
1. One module at a time; test each before moving on.
2. `git add -A && git commit -m "step X works"` after each green step.
3. If a step goes wrong, `git checkout .` and retry - don't pile on.
