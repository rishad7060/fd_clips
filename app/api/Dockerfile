# ============================================================
# FocalDive Clips — NestJS API  (build context = repo root)
# ============================================================
# The API spawns the Python pipeline as a child process, so the
# image bundles Node 20 + Python 3 + FFmpeg + pipeline code.
#
# Build from repo root:
#   docker build -t focaldive-api -f app/api/Dockerfile .
# ============================================================

# ------------------------------------------------------------
# Stage 1: builder — compile TypeScript → dist/
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app/api

# Install Node deps first (layer-cached until package.json changes)
COPY app/api/package*.json ./
RUN npm ci || npm install

# Copy the full API source (prisma schema, tsconfig, nest-cli.json, src/)
COPY app/api/ .

# Generate the Prisma client (writes to node_modules/@prisma/client)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ------------------------------------------------------------
# Stage 2: runner — lean production image with Python + FFmpeg
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

# OS dependencies:
#   python3 / pip / venv  — pipeline runtime
#   ffmpeg                — video processing
#   ca-certificates       — HTTPS (yt-dlp, API calls)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        ffmpeg \
        ca-certificates \
        # MediaPipe (reframe.py face detector) dlopens OpenGL/GLES + GLib at
        # runtime; the slim base lacks them → "libGLESv2.so.2: cannot open
        # shared object file". These provide libGL/libGLESv2/libEGL + libglib.
        libgl1 \
        libglib2.0-0 \
        libegl1 \
        libgles2 \
        libsm6 \
        libxext6 \
        libxrender1 && \
    # Symlink python → python3 so existing code that calls 'python' (e.g.
    # real-pipeline.worker.ts const PYTHON_BIN = 'python') works unchanged.
    ln -s /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── API artefacts from builder ────────────────────────────────
# Compiled JS
COPY --from=builder /app/api/dist        ./app/api/dist
# Runtime node_modules (includes @prisma/client generated in builder)
COPY --from=builder /app/api/node_modules ./app/api/node_modules
# package.json (needed by Node module resolution at runtime)
COPY --from=builder /app/api/package.json ./app/api/package.json
# Prisma schema + any migrations (prisma db push / migrate deploy reads schema)
COPY --from=builder /app/api/prisma      ./app/api/prisma

# ── Python pipeline ───────────────────────────────────────────
COPY pipeline/       ./pipeline/
COPY requirements.docker.txt ./requirements.docker.txt

# Install slim Python deps (no GPU libs — see requirements.docker.txt header)
# --break-system-packages is needed on Debian bookworm where pip is externally
# managed; using a venv is the cleaner alternative but adds path complexity.
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.docker.txt

# ── Environment ───────────────────────────────────────────────
# PIPELINE_REPO_ROOT: the cwd the API passes to python child processes so that
#   pipeline/run.py resolves workspace/ relative to the repo root (/app).
ENV PIPELINE_REPO_ROOT=/app
# PYTHON_BIN: picked up by clips.controller.ts and preview.controller.ts
#   (process.env.PYTHON_BIN || 'python'). The symlink above also covers any
#   codepath that still hardcodes 'python'.
ENV PYTHON_BIN=python3
ENV USE_REAL_PIPELINE=true
ENV LOCAL_FILES=true
ENV NODE_ENV=production
ENV API_PORT=4000

EXPOSE 4000

# ── Startup ───────────────────────────────────────────────────
# Working directory for node must be app/api so dist/main.js and the Prisma
# schema are found at their expected relative paths.
WORKDIR /app/app/api

# No prisma/migrations/ folder exists — use db push (idempotent schema sync)
# instead of migrate deploy (which requires migration history files).
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main.js"]
