# FocalDive Clips

FocalDive Clips is an Opus Clip–style SaaS that turns a long video (a YouTube URL or an uploaded file) into 5–10 ranked, captioned, vertical 9:16 short clips. It combines a Python AI pipeline, a NestJS API, and a Next.js web app into a single self-hostable stack.

## Architecture

```
Browser
   │
   ▼
web  (Next.js, :3000)
   │  REST + WebSocket
   ▼
api  (NestJS, :4000)  ──spawns──►  Python pipeline (bundled in the api image)
   │
   ├──►  Postgres   (jobs, clips, billing)
   └──►  Redis      (BullMQ job queue)
```

- **web** — Next.js 14 + Tailwind UI on port `3000`. Submit a URL/upload, watch live progress, browse and edit clips.
- **api** — NestJS on port `4000`. Owns jobs, billing, and progress. The api image bundles Node **and** Python 3 + ffmpeg, because it spawns `python pipeline/run.py` as a child process. Clips are written to a shared `workspace` volume and served over `/files`.
- **Postgres + Redis** — Postgres stores job/clip/billing data (schema synced via `prisma db push` on boot); Redis backs the BullMQ queue.

**Pipeline stages:** `ingest` → `transcribe` (Groq Whisper, CPU) → `score` (Gemini) → `extract` (FFmpeg cuts) → `reframe` (MediaPipe face tracking → 9:16) → `captions` (burned-in karaoke captions).

**Billing** runs on [Polar.sh](https://polar.sh) (sandbox by default).

## Prerequisites

- **Docker Desktop** (recommended path) — installed and running (`docker info` must succeed).
- **OR for local dev without Docker:** Node 20, Python 3.12, and `ffmpeg` on your PATH.

## Quick start with Docker (recommended)

```bash
cp .env.docker.example .env.docker        # then edit .env.docker
# Fill in at least: GROQ_API_KEY, GEMINI_API_KEY, POLAR_* (and a strong POSTGRES_PASSWORD)

docker compose --env-file .env.docker up --build -d
```

The first build takes a while — the api image installs Python + ffmpeg + MediaPipe.

| Service  | URL / port |
|----------|------------|
| Web      | http://localhost:3000 |
| API      | http://localhost:4000/health |
| Postgres | host port **5433** (mapped; a local Postgres may already own 5432) |
| Redis    | localhost:6379 |

See [DOCKER.md](DOCKER.md) for follow/stop commands, the optional manual pipeline run, and going-to-production notes.

## Local dev (no Docker)

On Windows, start the real stack (API + web against the real Python pipeline) with:

```powershell
pwsh ./start-real.ps1
```

This builds and launches the NestJS API on `:4000` and the Next.js web app on `:3000`. With no AI keys configured it falls back to **mock mode**, so the full app still runs end to end. Local env lives in a root `.env` file (gitignored). Note: CPU transcription is slow (~1–3× real time), so prefer speech-heavy videos a few minutes long.

## Environment variables

All variables are documented in [`.env.docker.example`](.env.docker.example). Key ones:

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq key for Whisper transcription (CPU path, no GPU needed) |
| `GEMINI_API_KEY` | Gemini key for clip scoring / virality ranking |
| `POLAR_ACCESS_TOKEN` | Polar.sh API token for billing |
| `POLAR_PRODUCT_STARTER` | Polar product id for the Starter plan |
| `POLAR_PRODUCT_PRO` | Polar product id for the Pro plan |
| `POLAR_WEBHOOK_SECRET` | Standard Webhooks secret so credits only grant on genuine Polar events |
| `DATABASE_URL` | Postgres connection string for the api/Prisma |
| `USE_REAL_PIPELINE` | `true` runs the real Python pipeline (vs. mock) |
| `MOCK_AUTH` | `true` injects a dev org so the app works without Clerk |

Secrets are gitignored (`.env`, `.env.local`, `.env.docker`). Never commit real secrets — copy `.env.docker.example` to `.env.docker` and fill it in.

## Project structure

```
.
├── pipeline/             # Python AI pipeline (ingest → transcribe → score → extract → reframe → captions)
├── app/
│   ├── api/              # NestJS API (jobs, billing, progress) + Prisma
│   └── web/              # Next.js 14 + Tailwind web app
├── docker-compose.yml    # web + api + postgres + redis
├── .env.docker.example   # env template for Docker
└── DOCKER.md             # Docker setup & operations guide
```

## Status / notes

- **Account creation (Clerk auth) is currently disabled.** `MOCK_AUTH=true` injects a dev org so every other feature works. Enable Clerk (`CLERK_SECRET_KEY` + `CLERK_JWKS_URL`) and flip `MOCK_AUTH=false` to turn it on.
- **Billing runs on the Polar.sh sandbox** by default. Switch to live with a production `POLAR_BASE_URL`, `POLAR_MODE=production`, and production token + product ids.
- **Transcription is CPU-based via Groq** — no GPU is required to run the stack.
