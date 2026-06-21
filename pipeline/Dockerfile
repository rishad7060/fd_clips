# ============================================================
# FocalDive Clips — Python pipeline (build context = repo root)
# ============================================================
# Standalone CPU pipeline image: ingest → transcribe (Groq) →
# score (Gemini) → extract → reframe (MediaPipe) → captions.
#
# The API image (app/api/Dockerfile) already bundles this same
# pipeline because the API spawns run.py as a child process. This
# standalone image is for running the pipeline directly or as a
# future split-out BullMQ worker (pipeline/worker.py).
#
# Build from repo root:
#   docker build -t focaldive-pipeline -f pipeline/Dockerfile .
# Run one job:
#   docker run --rm --env-file .env focaldive-pipeline \
#     python run.py "<youtube-url>" --clips 3 --job-id demo --json-progress
# ============================================================

FROM python:3.12-slim-bookworm

# OS deps: ffmpeg (cut/encode), ca-certificates (HTTPS for yt-dlp + API calls).
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Slim CPU-only requirements (no GPU torch/whisperx/pyannote — see the file
# header). Installed first so the layer caches until requirements change.
COPY requirements.docker.txt ./requirements.docker.txt
RUN pip install --no-cache-dir -r requirements.docker.txt

# The pipeline package. run.py resolves workspace/ relative to PIPELINE_REPO_ROOT.
COPY pipeline/ ./pipeline/

# Run from inside the package dir so `python run.py` and `from pipeline...` both
# resolve. PIPELINE_REPO_ROOT points one level up so workspace/ lands at /app.
ENV PIPELINE_REPO_ROOT=/app \
    PYTHONUNBUFFERED=1 \
    MOCK_MODE=auto

WORKDIR /app/pipeline

# Default: print the CLI help. Compose / `docker run` overrides this with a job.
CMD ["python", "run.py", "--help"]
