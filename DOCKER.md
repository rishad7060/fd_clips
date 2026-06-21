# Running FocalDive Clips with Docker

Full production stack in containers: **web** (Next.js) → **api** (NestJS + bundled
Python pipeline) → **postgres** + **redis**.

## Prerequisites
- Docker Desktop installed and **running** (reboot after install, launch it once,
  accept terms). Verify: `docker info` succeeds.

## One-time setup
```bash
cp .env.docker.example .env.docker     # already created with sandbox values
# Edit .env.docker: set a strong POSTGRES_PASSWORD; keys are pre-filled.
```

## Start everything
```bash
docker compose --env-file .env.docker up --build -d
```
First build takes a while (the api image installs Python + ffmpeg + MediaPipe).

- Web:  http://localhost:3000
- API:  http://localhost:4000/health
- Postgres: localhost:5432   ·   Redis: localhost:6379

## Watch / stop
```bash
docker compose logs -f api          # follow API + pipeline logs
docker compose ps                   # service status + health
docker compose down                 # stop (keeps volumes/data)
docker compose down -v              # stop AND wipe pgdata/redis/workspace
```

## How it fits together
- The **api** image bundles Node **and** Python 3 + ffmpeg, because the API spawns
  `python pipeline/run.py` as a child process. Clips are written to the shared
  **workspace** volume and served over `/files`.
- On boot the api runs `prisma db push` to sync the schema to Postgres (no
  migration history yet — switch to `migrate deploy` once you commit migrations).
- **Auth stays mock** (`MOCK_AUTH=true`) until account creation (Clerk) is wired —
  the API injects a fake org so every other feature works.
- The standalone **pipeline** image is profile-gated (`--profile tools`) for manual
  one-off runs; the normal flow doesn't need it.

## Manual pipeline run (optional)
```bash
docker compose --profile tools run --rm pipeline \
  python run.py "<youtube-url>" --clips 3 --job-id demo --json-progress
```

## Going to production (live)
In `.env.docker` (or your orchestrator's secrets):
- Set `NEXT_PUBLIC_API_URL`, `API_PUBLIC_URL`, `BILLING_SUCCESS_URL`,
  `BILLING_CANCEL_URL` to real HTTPS domains.
- Polar live: `POLAR_BASE_URL=https://api.polar.sh`, `POLAR_MODE=production`,
  a **production** access token + product ids, and `POLAR_WEBHOOK_SECRET`.
- Set a strong `POSTGRES_PASSWORD`.
- When account creation is enabled: set `CLERK_SECRET_KEY` + `CLERK_JWKS_URL`
  and flip `MOCK_AUTH=false`.
- Commit Prisma migrations and switch the api CMD to `prisma migrate deploy`.

## GPU note
The api/pipeline images use the **CPU** path (Groq transcription + MediaPipe),
so no GPU is required. Heavy GPU libs (whisperx/pyannote/torch) are intentionally
excluded from `requirements.docker.txt`. A separate GPU image can be added later
for the RunPod path.
